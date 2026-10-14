import { App, normalizePath } from "obsidian";

export type PlaybackMode = "pause" | "loop";
export type AspectRatio = "auto" | "4:3" | "16:9";
export type Orientation = "auto" | "landscape" | "portrait";

export interface Option<T extends string> { value: T; label: string; }

/** 各设置项的选项（首项即默认值） */
export const PLAYBACK_OPTIONS: Option<PlaybackMode>[] = [
    { value: "pause", label: "播完暂停" }, { value: "loop", label: "循环播放" },
];
export const ASPECT_OPTIONS: Option<AspectRatio>[] = [
    { value: "auto", label: "自动识别" }, { value: "4:3", label: "4:3" }, { value: "16:9", label: "16:9" },
];
export const ORIENTATION_OPTIONS: Option<Orientation>[] = [
    { value: "auto", label: "自动" }, { value: "landscape", label: "横屏" }, { value: "portrait", label: "竖屏" },
];

/** 快捷键可调用的播放器能力（由 CustomMediaPlayer 实现） */
export interface ShortcutTarget {
    togglePlay(): void;
    seekByStep(dir: 1 | -1): void;
    /** 切换跳转步长：dir=1 增大步长，dir=-1 减小步长 */
    cycleStep(dir: 1 | -1): void;
    adjustVolume(delta: number): void;
    toggleSubtitle(): void;
    insertTimestamp(): void;
    toggleFullscreen(): void;
}

export interface ShortcutDef {
    id: string;
    label: string;
    /** 默认键位（归一化格式，如 "c" / "Space" / "Shift+ArrowLeft"） */
    defaultKey: string;
    /** 触发时执行的动作，由传入的 target 执行 */
    run: (target: ShortcutTarget) => void;
    /** 是否要求媒体已就绪（readyState >= 1），默认 true */
    needsMedia?: boolean;
}

/** 可在快捷键面板中绑定的功能 */
export const SHORTCUT_DEFS: ShortcutDef[] = [
    { id: "togglePlay", label: "播放 / 暂停", defaultKey: "Space", run: t => t.togglePlay() },
    { id: "seekBackward", label: "后退一步", defaultKey: "ArrowLeft", run: t => t.seekByStep(-1) },
    { id: "seekForward", label: "前进一步", defaultKey: "ArrowRight", run: t => t.seekByStep(1) },
    { id: "cycleStepBackward", label: "减小跳转步长", defaultKey: "Shift+ArrowLeft", run: t => t.cycleStep(-1) },
    { id: "cycleStepForward", label: "增大跳转步长", defaultKey: "Shift+ArrowRight", run: t => t.cycleStep(1) },
    { id: "volumeUp", label: "增大音量", defaultKey: "ArrowUp", run: t => t.adjustVolume(0.05) },
    { id: "volumeDown", label: "减小音量", defaultKey: "ArrowDown", run: t => t.adjustVolume(-0.05) },
    { id: "toggleSubtitle", label: "切换字幕", defaultKey: "c", run: t => t.toggleSubtitle() },
    { id: "insertTimestamp", label: "插入时间戳", defaultKey: "t", needsMedia: false, run: t => t.insertTimestamp() },
    { id: "fullscreen", label: "全屏", defaultKey: "f", needsMedia: false, run: t => t.toggleFullscreen() },
];

export interface PlayerSettings {
    playbackMode: PlaybackMode;
    aspectRatio: AspectRatio;
    orientation: Orientation;
    /** 功能 id → 归一化键位 */
    shortcuts: Record<string, string>;
}

const SETTINGS_FILENAME = "player-settings.json";
let cached: PlayerSettings | null = null;
/** 设置文件在 vault 中的路径（由 initPlayerSettings 写入） */
let settingsPath: string | null = null;

/** 校验取值，非法则回退到默认值 */
function pick<T extends string>(value: unknown, options: Option<T>[], fallback: T): T {
    return options.some(o => o.value === value) ? (value as T) : fallback;
}

/** 解析已存设置，缺失 / 非法项回退默认；快捷键新增项自动补默认键位 */
function normalize(loaded: unknown): PlayerSettings {
    const obj = (loaded && typeof loaded === "object" ? loaded : {}) as Partial<PlayerSettings>;
    const shortcuts: Record<string, string> = {};
    for (const def of SHORTCUT_DEFS) {
        const saved = obj.shortcuts?.[def.id];
        shortcuts[def.id] = typeof saved === "string" && saved ? saved : def.defaultKey;
    }
    return {
        playbackMode: pick(obj.playbackMode, PLAYBACK_OPTIONS, PLAYBACK_OPTIONS[0].value),
        aspectRatio: pick(obj.aspectRatio, ASPECT_OPTIONS, ASPECT_OPTIONS[0].value),
        orientation: pick(obj.orientation, ORIENTATION_OPTIONS, ORIENTATION_OPTIONS[0].value),
        shortcuts,
    };
}

/**
 * 指定设置文件路径并加载已存设置（应由插件 onload 调用并 await）。
 * 路径为空时退化为内存默认值，不做持久化。
 */
export async function initPlayerSettings(app: App, pluginDir: string): Promise<PlayerSettings> {
    if (pluginDir) {
        settingsPath = normalizePath(`${pluginDir}/${SETTINGS_FILENAME}`);
        let raw: unknown = null;
        try {
            const text = await app.vault.adapter.read(settingsPath);
            raw = JSON.parse(text);
        } catch { /* 首次运行 / 读取失败：使用默认值 */ }
        cached = normalize(raw);
    } else {
        cached = normalize(null);
    }
    return cached;
}

/** 读取（并缓存）播放器设置；尚未加载时返回默认值 */
export function getPlayerSettings(_app: App): PlayerSettings {
    if (!cached) cached = normalize(null);
    return cached;
}

/** 将当前设置异步写入 JSON 文件（失败静默，避免打断交互） */
function persist(app: App) {
    if (!settingsPath || !cached) return;
    app.vault.adapter.write(settingsPath, JSON.stringify(cached, null, 2)).catch(() => {});
}

/** 合并写入设置，并持久化 */
export function updatePlayerSettings(app: App, patch: Partial<PlayerSettings>): PlayerSettings {
    const current = getPlayerSettings(app);
    cached = { ...current, ...patch, shortcuts: { ...current.shortcuts, ...patch.shortcuts } };
    persist(app);
    return cached;
}

/** 将某个快捷键恢复为默认值 */
export function resetShortcut(app: App, id: string): PlayerSettings {
    const def = SHORTCUT_DEFS.find(d => d.id === id);
    return updatePlayerSettings(app, { shortcuts: def ? { [id]: def.defaultKey } : {} });
}

/** 通知所有已渲染的播放器重新应用设置（DOM 事件，避免全局引用泄漏） */
export function refreshPlayers(app: App) {
    app.workspace.containerEl.ownerDocument
        .querySelectorAll<HTMLElement>(".custom-media-player")
        .forEach(el => el.dispatchEvent(new CustomEvent("tsp-settings-changed")));
}

/** 将 KeyboardEvent 归一化为 "Ctrl+Shift+Key" 形式的字符串 */
export function normalizeKeyEvent(e: KeyboardEvent): string {
    const mods = [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", e.metaKey && "Meta"]
        .filter(Boolean) as string[];
    const key = e.key === " " ? "Space"
        : e.key === "Esc" ? "Escape"
        : e.key.length === 1 ? e.key.toLowerCase()
        : e.key;
    return [...mods, key].join("+");
}

/** 是否只按下了修饰键（这类按键不能作为完整键位） */
export function isModifierOnly(e: KeyboardEvent): boolean {
    return ["Control", "Alt", "Shift", "Meta"].includes(e.key);
}

const KEY_LABELS: Record<string, string> = {
    ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", Space: "空格", Escape: "Esc",
};

/** 键位的可读显示：Shift+ArrowLeft → Shift+← */
export function prettyKey(binding: string): string {
    return binding.replace(/Arrow\w+|Space|Escape/g, m => KEY_LABELS[m] ?? m);
}
