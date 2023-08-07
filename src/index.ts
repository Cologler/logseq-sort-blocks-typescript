import "@logseq/libs";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";

async function main () {
    type Comparer = (a: BlockEntity, b: BlockEntity) => number;

    async function sortBlocks(source: BlockEntity[], comparer: Comparer) {
        if (!source.length) {
            return
        }

        console.debug("sortBlocks", source, comparer);

        let fromArray = Array.from(source);

        const toArray = fromArray
            .filter(x => x.content !== undefined)
            .sort(comparer);

        console.assert(fromArray.length === toArray.length);
        if (fromArray.length !== toArray.length) {
            // ?
            return
        }

        console.log("sortedBlocks", toArray);

        for (let index = 0; index < toArray.length; index++) {
            const block = toArray[index];
            if (fromArray[0] !== block) {
                if (index === 0) {
                    await logseq.Editor.moveBlock(block.uuid, fromArray[0].uuid, { before: true })
                }
                else {
                    await logseq.Editor.moveBlock(block.uuid, toArray[index-1].uuid);
                }
                fromArray = fromArray.filter(x => x !== block);
            }
            else {
                fromArray.shift()
            }
        }
    }

    const comparers = new Map<string, Comparer>([
        ["A-Z", (a: BlockEntity, b: BlockEntity) => a.content.localeCompare(b.content, "en", { numeric: true })],
        ["Z-A", (a: BlockEntity, b: BlockEntity) => -a.content.localeCompare(b.content, "en", { numeric: true })],
    ]);

    for (const key of comparers.keys()) {
        const comparer = comparers.get(key)!;

        logseq.beforeunload(
            logseq.Editor.registerBlockContextMenuItem(`Sort blocks: ${key}`, async (e) => {
                const block = await logseq.Editor.getBlock(e.uuid, { includeChildren: true });
                if (block) {
                    await sortBlocks(block.children as BlockEntity[], comparer)
                }
            }) as any
        );

        logseq.beforeunload(
            logseq.App.registerPageMenuItem(`Sort blocks: ${key}`, async ({ page }) => {

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
