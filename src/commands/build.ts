import fs from "fs-extra";
import path from "path";
import archiver from "archiver";

export async function build() {
    const papersDir = path.resolve('papers');
    
    if (!fs.existsSync(papersDir)) {
        throw new Error("papers ディレクトリが見つかりません");
    }

    const paperDirs = fs.readdirSync(papersDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    if (paperDirs.length === 0) {
        console.log("📝 papers ディレクトリに論文がありません");
        return;
    }

    const outDir = path.resolve('out');
    await fs.ensureDir(outDir);

    for (const paperDir of paperDirs) {
        console.log(`🔨 ビルド中: ${paperDir}`);
        const fullPath = path.join(papersDir, paperDir);
        
        const metaPath = path.join(fullPath, "meta.json");
        if (!fs.existsSync(metaPath)) {
            console.error(`❌ ${paperDir}/meta.json が見つかりません`);
            continue;
        }
        
        const metaContent = fs.readFileSync(metaPath, "utf-8");
        const meta = JSON.parse(metaContent);
        const version = meta.version;
        
        if (version === undefined) {
            console.error(`❌ ${paperDir}/meta.json に version がありません`);
            continue;
        }
        
        const outputPath = path.join(outDir, `${paperDir}.${version}.zip`);

        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", {
          zlib: { level: 0 }, // 無圧縮
          store: true
        });

        output.on("close", () => {
          console.log(`✅ ZIPファイルを作成: ${outputPath} (${archive.pointer()} bytes)`);
        });

        archive.on("error", (err) => {
          console.error(`❌ ${paperDir} のアーカイブに失敗:`, err);
        });

        archive.pipe(output);
        archive.directory(fullPath + "/", false);
        await archive.finalize();
    }
    
    console.log("✅ すべての論文のビルドが完了しました");
}
