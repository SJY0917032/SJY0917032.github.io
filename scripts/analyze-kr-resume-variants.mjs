#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const variants = [
  {
    id: "v1",
    name: "JD 매칭형",
    file: "docs/resume/variants/kr-backend/markdown/resume-v1-jd-balanced.md",
  },
  {
    id: "v2",
    name: "문제해결형",
    file: "docs/resume/variants/kr-backend/markdown/resume-v2-problem-solving.md",
  },
  {
    id: "v3",
    name: "아키텍처형",
    file: "docs/resume/variants/kr-backend/markdown/resume-v3-architecture.md",
  },
];

const metricRegex = /(\d|%|→|건|회|원|만|억|개국|대|분|시간|초)/;
const bulletRegex = /^\s*-\s+/;
const threshold = 0.35;

const reportRows = [];

for (const variant of variants) {
  const fullPath = path.join(repoRoot, variant.file);
  const content = fs.readFileSync(fullPath, "utf8");
  const lines = content.split("\n");

  const bullets = lines.filter((line) => bulletRegex.test(line));
  const metricBullets = bullets.filter((line) => metricRegex.test(line));
  const ratio = bullets.length === 0 ? 0 : metricBullets.length / bullets.length;

  reportRows.push({
    ...variant,
    bullets: bullets.length,
    metricBullets: metricBullets.length,
    ratio,
    pass: ratio >= threshold,
  });
}

const generatedAt = new Date().toISOString();
const mdLines = [
  "# 성과지표 문장 비율 리포트",
  "",
  `- Generated at: \`${generatedAt}\``,
  `- Threshold: \`${Math.round(threshold * 100)}%\``,
  "",
  "| Variant | 전체 bullet 수 | 성과/수치 bullet 수 | 비율 | 상태 |",
  "| --- | ---: | ---: | ---: | --- |",
  ...reportRows.map(
    (row) =>
      `| ${row.id} (${row.name}) | ${row.bullets} | ${row.metricBullets} | ${(row.ratio * 100).toFixed(1)}% | ${
        row.pass ? "PASS" : "FAIL"
      } |`,
  ),
  "",
  "## 판정 기준",
  "",
  "- 전체 bullet 대비 수치/성과 문장 비율이 35% 이상이면 PASS",
  "- 수치가 없는 일반 설명 문장도 필요하므로 100%를 목표로 하지 않음",
  "",
  "## 결과 해석",
  "",
  "- v1: 채용담당자 1차 검토용이라 수치 문장 비중을 높게 유지",
  "- v2: 문제해결 스토리 전달을 위해 설명 문장과 성과 문장을 혼합",
  "- v3: 설계 원칙 문장 비중이 높지만 성과 섹션으로 수치 근거를 보강",
];

const jsonOutput = {
  generatedAt,
  threshold,
  variants: reportRows.map((row) => ({
    id: row.id,
    name: row.name,
    bullets: row.bullets,
    metricBullets: row.metricBullets,
    ratio: Number(row.ratio.toFixed(4)),
    pass: row.pass,
  })),
};

const reportDir = path.join(repoRoot, "docs", "resume", "variants", "kr-backend", "reports");
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "metrics-ratio.md"), `${mdLines.join("\n")}\n`);
fs.writeFileSync(path.join(reportDir, "metrics-ratio.json"), `${JSON.stringify(jsonOutput, null, 2)}\n`);

const failed = reportRows.filter((row) => !row.pass);
if (failed.length > 0) {
  console.error(`Metric ratio check failed: ${failed.map((row) => row.id).join(", ")}`);
  process.exit(1);
}

console.log("KR resume variant metric ratio report generated.");
