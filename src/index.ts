import "@logseq/libs";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";

async function main () {
    type Comparer = (a: BlockEntity, b: BlockEntity) => number;

    async function sortChildren(parentBlock: BlockEntity, comparer: Comparer) {
        if (!parentBlock.children?.length) {
            return
        }

        let fromArray = Array.from(parentBlock.children);

        const toArray = fromArray
            .filter(x => (x as BlockEntity).content !== undefined)
            .map(x => <BlockEntity> x)
            .sort(comparer);

        console.assert(fromArray.length === toArray.length);
        if (fromArray.length !== toArray.length) {
            // ?
            return
        }

        for (let index = 0; index < toArray.length; index++) {
            const block = toArray[index];
            if (fromArray[0] !== block) {
                if (index === 0) {
                    await logseq.Editor.moveBlock(block.uuid, parentBlock.uuid, { children: true })
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

    logseq.beforeunload(
        logseq.Editor.registerBlockContextMenuItem('Sort blocks: A-Z', async (e) => {
            const block = await logseq.Editor.getBlock(e.uuid, { includeChildren: true });
            if (block) {
                await sortChildren(block, (a, b) => a.content.localeCompare(b.content, "en", { numeric: true }));
            }
        }) as any
    );

    logseq.beforeunload(
        logseq.Editor.registerBlockContextMenuItem('Sort blocks: Z-A', async (e) => {
            const block = await logseq.Editor.getBlock(e.uuid, { includeChildren: true });
            if (block) {
                await sortChildren(block, (a, b) => -a.content.localeCompare(b.content, "en", { numeric: true }));
            }
        }) as any
    );
}

if (typeof logseq !== 'undefined') {
    logseq.ready(main).catch(console.error);
}
