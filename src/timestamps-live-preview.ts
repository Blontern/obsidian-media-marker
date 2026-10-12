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

            // 光标所在整行回退为源码
            const line = view.state.doc.lineAt(from);
            if (cursor.from <= line.to && cursor.to >= line.from) return;

            const timeStr = match[0];
            const totalSeconds = parseTimestamp(timeStr);
            add(from, to, Decoration.replace({
                widget: new TimestampWidget(timeStr, totalSeconds, manager),
                inclusive: false,
            }));
        },
    });

    const cursorLine = (view: EditorView): number =>
        view.state.doc.lineAt(view.state.selection.main.head).number;

    return Prec.high(ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;
            private lastCursorLine: number;

            constructor(view: EditorView) {
                this.decorations = matcher.createDeco(view);
                this.lastCursorLine = cursorLine(view);
            }

            update(update: ViewUpdate) {
                const newCursorLine = cursorLine(update.view);

                if (
                    update.docChanged ||
                    update.viewportChanged ||
                    newCursorLine !== this.lastCursorLine
                ) {
                    this.decorations = matcher.createDeco(update.view);
                    this.lastCursorLine = newCursorLine;
                }
            }
        },
        { decorations: (v) => v.decorations }
    ));
}