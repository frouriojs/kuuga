import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export function pin() {
    const outDir = path.resolve('out');
    
    if (!fs.existsSync(outDir)) {
        console.error("❌ out ディレクトリが見つかりません。先に build コマンドを実行してください");
        process.exit(1);
    }

    const paperDirs = fs.readdirSync(outDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    if (paperDirs.length === 0) {
        console.log("📝 out ディレクトリに論文がありません");
        return;
    }

    // すべての論文ディレクトリをピン留め
    for (const paperDir of paperDirs) {
        const paperPath = path.join(outDir, paperDir);
        const versions = fs.readdirSync(paperPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const version of versions) {
            const versionPath = path.join(paperPath, version);
            console.log(`📦 ピン留め中: ${paperDir}/${version}`);
            
            try {
                const output = execSync(`ipfs add --cid-version=1 --pin=true --recursive "${versionPath}"`, {
                    encoding: "utf-8"
                });
                const lines = output.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                console.log(`✅ ピン留め成功: ${lastLine}`);
            } catch (err) {
                console.error(`❌ ${paperDir}/${version} のピン留めに失敗:`, err);
            }
        }
    }

    // papers内のmeta.jsonから引用先をピン留め
    const papersDir = path.resolve('papers');
    if (fs.existsSync(papersDir)) {
        const paperDirs = fs.readdirSync(papersDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const paperDir of paperDirs) {
            const metaPath = path.join(papersDir, paperDir, "meta.json");
            if (fs.existsSync(metaPath)) {
                console.log(`📋 引用先チェック: ${paperDir}`);
                const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
                for (const ref of meta.references || []) {
                    try {
                        console.log(`📌 引用先ピン留め: ${ref}`);
                        execSync(`ipfs pin add ${ref}`, { stdio: "inherit" });
                    } catch (err) {
                        console.warn(`⚠️ 引用先 ${ref} のピン留めに失敗:`, err);
                    }
                }
            }
        }
    }

    console.log("✅ すべてのピン留めが完了しました");
}
