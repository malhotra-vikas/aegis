// Replay harness: re-run the risk engine over every stored HealthSnapshot's
// rawPayload and flag any drift vs the persisted score/bucket. The rawPayload is
// kept precisely for replay (AEGIS_DATA_MODEL) — this turns accumulated real
// pulls into a regression corpus, so an engine change that silently shifts scores
// is caught. Run: pnpm --filter @aegis/db replay
import 'dotenv/config';
import { assessRaw, metaAdapter } from '@aegis/risk-engine';
import { createPrismaClient } from './index.js';

const db = createPrismaClient();
try {
  const snapshots = await db.healthSnapshot.findMany({
    select: { id: true, score: true, bucket: true, rawPayload: true, modelVersion: true },
  });

  let drift = 0;
  for (const s of snapshots) {
    const result = assessRaw(metaAdapter, s.rawPayload);
    const recomputed = Math.round(result.score * 100) / 100;
    if (recomputed !== s.score || result.bucket.toUpperCase() !== s.bucket) {
      drift++;
      console.log(`DRIFT ${s.id}: stored ${s.score}/${s.bucket} → recomputed ${recomputed}/${result.bucket.toUpperCase()}`);
    }
  }
  console.log(`Replayed ${snapshots.length} snapshot(s); ${drift} drift.`);
  process.exitCode = drift > 0 ? 1 : 0;
} finally {
  await db.$disconnect();
}
