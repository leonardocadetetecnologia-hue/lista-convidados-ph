import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rdlnnffzrbpttfxzcghs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbG5uZmZ6cmJwdHRmeHpjZ2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTg1MDEsImV4cCI6MjA5NDc5NDUwMX0.kt7YBpFbD9YdsxiPuUQyvW-ws96UDGJcGh6RMQGNTUs";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TOTAL = 50;       // total de inserts
const CONCURRENT = 10;  // quantos simultâneos por rodada

const names = [
  "Ana Lima","Bruno Costa","Carla Souza","Diego Reis","Elena Matos",
  "Felipe Andrade","Gabi Ferreira","Hugo Lopes","Iris Mendes","João Nunes",
  "Karen Alves","Lucas Borges","Marina Dias","Nathan Gomes","Olivia Santos",
  "Paulo Rocha","Quinn Cardoso","Rafael Teixeira","Sara Oliveira","Tiago Pereira",
  "Ursula Freitas","Victor Ramos","Wendy Castro","Xande Moura","Yara Silveira",
  "Zeca Barbosa","Alice Cunha","Beto Pinto","Clara Vieira","Davi Nascimento",
  "Ester Campos","Fabio Araujo","Gina Ribeiro","Henrique Faria","Ingrid Moreira",
  "Jorge Batista","Kelly Correia","Leo Azevedo","Manu Carvalho","Nico Martins",
  "Otto Fernandes","Patricia Lima","Quintino Cruz","Rosa Cavalcante","Sergio Guimaraes",
  "Talia Monteiro","Uriel Machado","Vera Rodrigues","Wagner Pires","Ximena Bastos",
];

function makePayload(i) {
  const name = names[i % names.length];
  const suffix = Math.floor(i / names.length) > 0 ? ` ${Math.floor(i / names.length) + 1}` : "";
  const digits = String(10000000000 + i).padStart(11, "0");
  return {
    full_name: name + suffix,
    instagram: `@${name.split(" ")[0].toLowerCase()}${i}`,
    phone: `319${digits.slice(0, 8)}`,
    email: `teste${i}@loadtest.com`,
    cpf: digits,
    event_name: "PH_TEST",
  };
}

async function runBatch(batch) {
  return Promise.all(
    batch.map(async (i) => {
      const start = Date.now();
      const { error } = await supabase.from("guests").insert(makePayload(i));
      const ms = Date.now() - start;
      return { i, ms, ok: !error, error: error?.message };
    })
  );
}

async function cleanup() {
  const { error } = await supabase.from("guests").delete().eq("event_name", "PH_TEST");
  if (!error) console.log("\n🧹 Registros de teste removidos com sucesso.");
  else console.log("\n⚠ Erro ao limpar:", error.message);
}

async function main() {
  console.log(`\n== LOAD TEST ==`);
  console.log(`Total: ${TOTAL} inserts | Concorrência: ${CONCURRENT} simultâneos\n`);

  const allResults = [];
  const totalStart = Date.now();

  for (let offset = 0; offset < TOTAL; offset += CONCURRENT) {
    const batch = Array.from({ length: Math.min(CONCURRENT, TOTAL - offset) }, (_, j) => offset + j);
    const label = `Lote ${Math.floor(offset / CONCURRENT) + 1}/${Math.ceil(TOTAL / CONCURRENT)} (inserts ${offset + 1}–${offset + batch.length})`;
    process.stdout.write(`${label}... `);
    const results = await runBatch(batch);
    allResults.push(...results);
    const ok = results.filter((r) => r.ok).length;
    const avgMs = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
    console.log(`✓ ${ok}/${results.length} ok | média ${avgMs}ms`);
  }

  const totalMs = Date.now() - totalStart;
  const successes = allResults.filter((r) => r.ok);
  const failures = allResults.filter((r) => !r.ok);
  const times = allResults.map((r) => r.ms).sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];

  console.log(`\n── RESULTADO ──────────────────────────`);
  console.log(`Sucesso:       ${successes.length}/${TOTAL}`);
  console.log(`Falhas:        ${failures.length}`);
  console.log(`Tempo total:   ${totalMs}ms (${(totalMs / 1000).toFixed(1)}s)`);
  console.log(`Throughput:    ${(TOTAL / (totalMs / 1000)).toFixed(1)} inserts/seg`);
  console.log(`Latência p50:  ${p50}ms`);
  console.log(`Latência p95:  ${p95}ms`);
  console.log(`Latência p99:  ${p99}ms`);

  if (failures.length > 0) {
    console.log(`\nErros encontrados:`);
    failures.forEach((f) => console.log(`  #${f.i}: ${f.error}`));
  }

  await cleanup();
}

main().catch(console.error);
