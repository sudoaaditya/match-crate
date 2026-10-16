/*
 * Shrinks the low-poly vehicle GLBs for shipping (~1.3 MB -> ~130 KB for all nine):
 *   - drops per-face normals (they block welding; prepareModel() recomputes flat normals)
 *   - welds + simplifies to at most MAX_TRIS triangles within a small error
 *   - quantizes and meshopt-compresses (drei's useGLTF decodes meshopt out of the box)
 * Materials are kept as separate parts: their names drive the paint-job recolours.
 *
 *   node src/utils/optimizeModels.mjs <sourceDir> [maxTris=1200] [error=0.01]
 *
 * <sourceDir> must hold the ORIGINAL, unoptimized GLBs (running it on already-optimized
 * files simplifies them again). The originals are in git history before Phase 5:
 *   git show <commit>:public/assets/models/Tank.glb > Tank.glb
 * Output goes to public/assets/models/, overwriting files with the same name.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, prune, quantize, reorder, simplify, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [sourceDir, maxTrisArg, errorArg] = process.argv.slice(2);
if (!sourceDir) {
    console.error('usage: node src/utils/optimizeModels.mjs <sourceDir> [maxTris] [error]');
    process.exit(1);
}
const MAX_TRIS = Number(maxTrisArg ?? 1200);
const ERROR = Number(errorArg ?? 0.01);
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/assets/models");

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const primitives = (doc) => doc.getRoot().listMeshes().flatMap(m => m.listPrimitives());
const triangles = (doc) => primitives(doc).reduce((n, p) => n + (p.getIndices() ?? p.getAttribute('POSITION')).getCount() / 3, 0);

for (const file of readdirSync(sourceDir).filter(f => f.endsWith('.glb'))) {
    const src = join(sourceDir, file);
    const doc = await io.read(src);
    const before = triangles(doc);

    for (const prim of primitives(doc)) {
        const normal = prim.getAttribute('NORMAL');
        if (normal) { prim.setAttribute('NORMAL', null); normal.dispose(); }
    }

    await doc.transform(
        dedup(),
        weld(),
        simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, MAX_TRIS / before), error: ERROR }),
        prune(),
        reorder({ encoder: MeshoptEncoder }),
        quantize(),
    );
    doc.createExtension(EXTMeshoptCompression)
        .setRequired(true)
        .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });

    const out = join(OUT, file);
    await io.write(out, doc);
    console.log(`${file.padEnd(24)} ${Math.round(before)} -> ${Math.round(triangles(doc))} tris, ${(statSync(src).size / 1024).toFixed(0)} KB -> ${(statSync(out).size / 1024).toFixed(1)} KB`);
}
