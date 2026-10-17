import { App } from "obsidian";
import {
    EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet,
    WidgetType, MatchDecorator,
} from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { TimestampManager } from "./timestamps";
import { parseTimestamp, createInlineTsRegex } from "./utils/time";
import { buildTimestampButton } from "./utils/ts-button";

class TimestampWidget extends WidgetType {
    constructor(
        private timeStr: string,
        private totalSeconds: number,
        private manager: TimestampManager
    ) {
        super();
    }

    eq(other: TimestampWidget): boolean {
        return this.timeStr === other.timeStr
            && this.totalSeconds === other.totalSeconds;
    }

    toDOM(_view: EditorView): HTMLElement {
        return buildTimestampButton(this.timeStr, this.totalSeconds, (btn, e) => {
            e.preventDefault();
            e.stopPropagation();
            this.manager.togglePlay(btn, this.totalSeconds);
        });
    }

    ignoreEvent(): boolean {
        return true;
    }
}

export function createLivePreviewTimestampExtension(app: App, manager: TimestampManager) {
    const matcher = new MatchDecorator({
        regexp: createInlineTsRegex(),
        decorate: (add, from, to, match, view) => {
            const cursor = view.state.selection.main;

            // 光标落入时间戳范围内时回退为源码
            if (cursor.from <= to && cursor.to >= from) return;

            const timeStr = match[0];
            const totalSeconds = parseTimestamp(timeStr);
            add(from, to, Decoration.replace({
                widget: new TimestampWidget(timeStr, totalSeconds, manager),
                inclusive: false,
            }));
        },
    });

    return Prec.high(ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = matcher.createDeco(view);
            }

            update(update: ViewUpdate) {
                if (
                    update.docChanged ||
                    update.viewportChanged ||
                    update.selectionSet
                ) {
                    this.decorations = matcher.createDeco(update.view);
                }
            }
        },
        { decorations: (v) => v.decorations }
    ));
}