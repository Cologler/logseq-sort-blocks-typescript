import "@logseq/libs";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";

function isPagePropertiesBlock(block: BlockEntity) {
    // preBlock? is not the public API
    return block.level === 1 && block['preBlock?'] === true;
}

async function main () {
    type Comparer = (a: string, b: string) => number;

    async function sortBlocks(source: BlockEntity[], comparer: Comparer) {
        if (source.some(x => typeof x.content !== 'string')) {
            return
        }

        if (isPagePropertiesBlock(source[0])) {
            // do not sort page properties
            source = source.slice(1);
        }

        if (source.length === 0) {
            return;
        }

        let fromArray = Array.from(source);
        // console.debug() is async print, fromArray is empty when printing.
        console.debug("Sort blocks", source);

        const toArray = Array.from(source).sort((a, b) => comparer(a.content, b.content));
        console.log("Sorted blocks", toArray);

        for (let index = 0; index < toArray.length; index++) {
            const block = toArray[index];
            if (fromArray[0] !== block) {
                if (index === 0) {
                    // move before first one
                    await logseq.Editor.moveBlock(block.uuid, fromArray[0].uuid, { before: true })
                }
                else {
                    // move after previous
                    await logseq.Editor.moveBlock(block.uuid, toArray[index-1].uuid);
                }
                fromArray = fromArray.filter(x => x !== block);
            }
            else {
                // already in the right place
                fromArray.shift()
            }
        }
    }

    const comparers = new Map<string, Comparer>([
        ["A-Z", (a: string, b: string) => a.localeCompare(b, "en", { numeric: true })],
        ["Z-A", (a: string, b: string) => -a.localeCompare(b, "en", { numeric: true })],
    ]);

    for (const key of comparers.keys()) {
        const comparer = comparers.get(key)!;
        const menuItemLabel = `Sort blocks: ${key}`;

        logseq.beforeunload(
            logseq.Editor.registerBlockContextMenuItem(menuItemLabel, async (e) => {
                const block = await logseq.Editor.getBlock(e.uuid, { includeChildren: true });
                if (block) {
                    await sortBlocks(block.children as BlockEntity[], comparer)
                }
            }) as any
        );

        logseq.beforeunload(
            logseq.App.registerPageMenuItem(menuItemLabel, async ({ page }) => {

                // `logseq.Editor.getPage(page, { includeChildren: true });`
                // will return a null children

                const blocks = await logseq.Editor.getPageBlocksTree(page);
                await sortBlocks(blocks, comparer);
            }) as any
        );
    }
}

if (typeof logseq !== 'undefined') {
    logseq.ready(main).catch(console.error);
}
