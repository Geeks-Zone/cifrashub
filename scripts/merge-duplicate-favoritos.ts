import { config } from "dotenv";
config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log("Iniciando varredura por pastas 'Favoritos' duplicadas...");

  const allFolders = await db.select().from(schema.userFolders);
  
  // Agrupar pastas por userId
  const foldersByUser = new Map<string, typeof allFolders>();
  for (const f of allFolders) {
    if (f.title === "Favoritos") {
      const arr = foldersByUser.get(f.userId) || [];
      arr.push(f);
      foldersByUser.set(f.userId, arr);
    }
  }

  let mergedCount = 0;
  let deletedCount = 0;

  for (const [userId, folders] of foldersByUser.entries()) {
    if (folders.length > 1) {
      console.log(`Usuário ${userId} possui ${folders.length} pastas 'Favoritos'. Mesclando...`);
      
      // A primeira será a principal (preferimos a que é isDefault: true ou a mais antiga)
      folders.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const rootFolder = folders[0];
      const duplicates = folders.slice(1);
      
      const duplicateIds = duplicates.map(d => d.id);

      // Pegar as músicas das pastas duplicadas
      const songsInDuplicates = await db.select().from(schema.userSongs).where(inArray(schema.userSongs.folderId, duplicateIds));
      
      if (songsInDuplicates.length > 0) {
        // Encontrar as músicas na pasta principal para evitar duplicar arranjos (Unique constraint no banco)
        const songsInRoot = await db.select().from(schema.userSongs).where(eq(schema.userSongs.folderId, rootFolder.id));
        const rootArrangements = new Set(songsInRoot.map(s => s.arrangementId));

        let maxPos = songsInRoot.reduce((max, s) => Math.max(max, s.position), -1);

        for (const song of songsInDuplicates) {
          if (!rootArrangements.has(song.arrangementId)) {
            // Move pra pasta principal
            maxPos++;
            await db.update(schema.userSongs).set({ folderId: rootFolder.id, position: maxPos }).where(eq(schema.userSongs.id, song.id));
            rootArrangements.add(song.arrangementId);
          } else {
            // Já existe esse arranjo nos favoritos, então apagar a duplicata
            await db.delete(schema.userSongs).where(eq(schema.userSongs.id, song.id));
          }
        }
        mergedCount += songsInDuplicates.length;
      }

      // Agora podemos deletar as pastas duplicadas em segurança
      await db.delete(schema.userFolders).where(inArray(schema.userFolders.id, duplicateIds));
      deletedCount += duplicateIds.length;
      
      // Atualizar a principal para isDefault = true (caso tenha perdido a flag)
      if (!rootFolder.isDefault) {
        await db.update(schema.userFolders).set({ isDefault: true }).where(eq(schema.userFolders.id, rootFolder.id));
      }
    }
  }

  console.log("Limpeza concluída com sucesso!");
  console.log(`Músicas movidas/mescladas: ${mergedCount}`);
  console.log(`Pastas duplicadas deletadas: ${deletedCount}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Erro na limpeza:", err);
  process.exit(1);
});
