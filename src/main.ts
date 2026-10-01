import { Plugin, MarkdownPostProcessorContext, TFile } from "obsidian";
import { TimestampManager } from "./timestamps";

const MEDIA_EMBED_RE = /!\[\[.+?\.(mp3|webm|wav|m4a|ogg|3gp|flac|mp4|mov|avi|mkv|mpeg)\]\]/i;

export default class TimestampPlayerPlugin extends Plugin {
    private timestampManager: TimestampManager;

    onload() {
        this.timestampManager = new TimestampManager(this.app);

        this.registerMarkdownPostProcessor(
            async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
                if (!(await this.hasMediaEmbed(ctx))) return;
                this.timestampManager.processTimestamps(el);
                this.timestampManager.rewriteMediaElements(el);
            }
        );
    }

    onunload() {
        this.timestampManager.clearPlaybackState();
    }

    private async hasMediaEmbed(ctx: MarkdownPostProcessorContext): Promise<boolean> {
        const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!(file instanceof TFile)) return false;
        const content = await this.app.vault.cachedRead(file);
        return MEDIA_EMBED_RE.test(content);
    }
}
