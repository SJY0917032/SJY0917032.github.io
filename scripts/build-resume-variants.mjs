#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "docs", "resume", "index.md");
const variantsRoot = path.join(repoRoot, "docs", "resume", "variants");
const withPdf = process.argv.includes("--pdf");
const generatedAt = new Date().toISOString();

const outputDirs = ["data", "logs", "templates", "markdown", "html", "pdf"];
for (const dir of outputDirs) {
  fs.mkdirSync(path.join(variantsRoot, dir), { recursive: true });
}

const sourceText = fs.readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

function escapeHtml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function applyInlineMarkdown(input) {
  let text = escapeHtml(input);
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  return text;
}

function stripMarkdownSyntax(input) {
  return input
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function unique(arr) {
  return [...new Set(arr.map((item) => item.trim()).filter(Boolean))];
}

function splitTopSections(markdown) {
  const lines = markdown.split("\n");
  const sections = { __HEADER__: [] };
  const sectionCounts = {};
  let current = "__HEADER__";

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      const title = match[1].trim();
      current = title;
      sectionCounts[title] = (sectionCounts[title] || 0) + 1;
      if (!sections[current]) {
        sections[current] = [];
      }
      continue;
    }
    sections[current].push(line);
  }

  return { sections, sectionCounts };
}

function parseHeader(lines) {
  const clean = lines.map((line) => line.trim()).filter(Boolean);
  const first = clean[0] ?? "";
  const titleMatch = first.match(/^#\s*(.+?)\s*\|\s*(.+)$/);

  const name = titleMatch ? titleMatch[1].trim() : first.replace(/^#\s*/, "").trim();
  const role = titleMatch ? titleMatch[2].trim() : "Backend Engineer";

  const contacts = [];
  for (const rawLine of clean.slice(1)) {
    if (rawLine.includes("|")) {
      const [label, ...rest] = rawLine.split("|");
      contacts.push({ label: label.trim(), value: rest.join("|").trim() });
      continue;
    }

    if (rawLine.includes(":")) {
      const idx = rawLine.indexOf(":");
      contacts.push({
        label: rawLine.slice(0, idx).trim(),
        value: rawLine.slice(idx + 1).trim(),
      });
      continue;
    }

    contacts.push({ label: "Info", value: rawLine.trim() });
  }

  return { name, role, contacts };
}

function parseAbout(lines) {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function parseSkills(lines) {
  const categories = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(/^\*\*(.+?)\*\*\s*·\s*(.+)$/);
    if (!match) continue;

    const category = match[1].trim();
    const items = match[2]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    categories.push({ category, items });
  }

  return categories;
}

function parseCompanyHeading(text) {
  const chunks = text.split("|").map((chunk) => chunk.trim());
  return {
    company: chunks[0] ?? text.trim(),
    role: chunks[1] ?? "",
    period: chunks[2] ?? "",
  };
}

function parseExperience(lines) {
  const experiences = [];
  let currentCompany = null;
  let currentProject = null;

  const flushProject = () => {
    if (!currentCompany || !currentProject) return;
    currentProject.techStack = unique(currentProject.techStack);
    currentCompany.projects.push(currentProject);
    currentProject = null;
  };

  const flushCompany = () => {
    if (!currentCompany) return;
    flushProject();
    experiences.push(currentCompany);
    currentCompany = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line === "---") {
      continue;
    }

    const companyMatch = line.match(/^###\s+(.+)$/);
    if (companyMatch) {
      flushCompany();
      const heading = parseCompanyHeading(companyMatch[1].trim());
      currentCompany = {
        heading: companyMatch[1].trim(),
        company: heading.company,
        role: heading.role,
        period: heading.period,
        overview: [],
        highlights: [],
        projects: [],
      };
      continue;
    }

    const projectMatch = line.match(/^####\s+(.+)$/);
    if (projectMatch) {
      if (!currentCompany) continue;
      flushProject();
      currentProject = {
        title: projectMatch[1].trim(),
        techStack: [],
        context: [],
        bullets: [],
        results: [],
      };
      continue;
    }

    if (currentProject && line.startsWith("`")) {
      const stacks = [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
      currentProject.techStack.push(...stacks);
      continue;
    }

    if (/^- /.test(line)) {
      const content = line.replace(/^-+\s*/, "").trim();
      if (currentProject) {
        currentProject.bullets.push(content);
      } else if (currentCompany) {
        currentCompany.highlights.push(content);
      }
      continue;
    }

    if (/^→\s*/.test(line)) {
      const outcome = line.replace(/^→\s*/, "").trim();
      if (currentProject) {
        currentProject.results.push(outcome);
      } else if (currentCompany) {
        currentCompany.highlights.push(outcome);
      }
      continue;
    }

    if (currentProject) {
      currentProject.context.push(line);
      continue;
    }

    if (currentCompany) {
      currentCompany.overview.push(line);
    }
  }

  flushCompany();
  return experiences;
}

function parseOpenSource(lines) {
  const entries = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    current.techStack = unique(current.techStack);
    entries.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const headingMatch = line.match(/^###\s+(.+)$/);
    if (headingMatch) {
      flush();
      current = {
        title: headingMatch[1].trim(),
        techStack: [],
        details: [],
        contributions: [],
      };
      continue;
    }

    if (!current) continue;

    if (/^`/.test(line)) {
      const stacks = [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
      current.techStack.push(...stacks);
      continue;
    }

    if (/^\*\*#\d+/.test(line)) {
      current.contributions.push(stripMarkdownSyntax(line));
      continue;
    }

    current.details.push(stripMarkdownSyntax(line));
  }

  flush();
  return entries;
}

function parseEducation(lines) {
  const entries = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    entries.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const headingMatch = line.match(/^\*\*(.+)\*\*\s*\|\s*(.+)$/);
    if (headingMatch) {
      flush();
      current = {
        title: headingMatch[1].trim(),
        period: headingMatch[2].trim(),
        details: [],
      };
      continue;
    }

    if (!current) {
      current = { title: line, period: "", details: [] };
      continue;
    }

    if (/^- /.test(line)) {
      current.details.push(line.replace(/^-+\s*/, "").trim());
      continue;
    }

    current.details.push(line);
  }

  flush();
  return entries;
}

function buildNormalizedModel(markdown) {
  const { sections, sectionCounts } = splitTopSections(markdown);

  const person = parseHeader(sections.__HEADER__ ?? []);
  const about = parseAbout(sections["About Me"] ?? []);
  const skills = parseSkills(sections.Skill ?? []);
  const experiences = parseExperience(sections.Experience ?? []);
  const openSource = parseOpenSource(sections["Open Source"] ?? []);
  const education = parseEducation(sections.Education ?? []);

  const projects = experiences.flatMap((exp) =>
    exp.projects.map((project) => ({
      company: exp.company,
      role: exp.role,
      period: exp.period,
      ...project,
    })),
  );

  return {
    metadata: {
      source: path.relative(repoRoot, sourcePath),
      generatedAt,
      sectionCounts,
    },
    person,
    about,
    skills,
    experiences,
    projects,
    openSource,
    education,
  };
}

function collectTopOutcomes(model, maxCount) {
  const outcomes = [];
  for (const project of model.projects) {
    for (const result of project.results) {
      outcomes.push(result);
    }
  }
  if (outcomes.length < maxCount) {
    for (const project of model.projects) {
      if (project.bullets[0]) outcomes.push(project.bullets[0]);
    }
  }
  return unique(outcomes).slice(0, maxCount);
}

function pickText(parts, fallback = "") {
  for (const part of parts) {
    if (part && part.trim()) return part.trim();
  }
  return fallback;
}

function formatContactLines(person) {
  return person.contacts
    .map((contact) => `- ${contact.label ? `${contact.label}: ` : ""}${contact.value}`)
    .join("\n");
}

function formatSkills(model) {
  return model.skills
    .map((skill) => `- ${skill.category}: ${skill.items.join(", ")}`)
    .join("\n");
}

function renderMinimal(model, variant) {
  const topOutcomes = collectTopOutcomes(model, 8);
  const companySummaries = model.experiences.map((exp) => {
    const highlightProjects = exp.projects.slice(0, 2).map((p) => p.title).join(", ");
    const result = pickText(exp.projects.flatMap((project) => project.results), exp.highlights[0] ?? "운영 자동화 및 안정화 주도");
    return `### ${exp.company} | ${exp.role} | ${exp.period}
- ${pickText(exp.overview, "도메인 요구를 NestJS 기반 시스템으로 설계 및 운영")}
- 핵심 프로젝트: ${highlightProjects || "핵심 업무 자동화"}
- 대표 성과: ${result}`;
  });

  const projectHighlights = model.projects.slice(0, 5).map((project) => {
    const context = pickText(project.context, "운영 병목을 해결하기 위한 백엔드 구조 개선");
    const result = pickText(project.results, "운영 안정성과 처리 효율을 개선");
    return `### ${project.title} (${project.company})
- 상황: ${context}
- 기술: ${project.techStack.join(", ") || "NestJS, TypeScript"}
- 성과: ${result}`;
  });

  return `# ${model.person.name} | ${model.person.role} (미니멀형)

## 연락처
${formatContactLines(model.person)}

## 한 줄 소개
${model.about}

## 핵심 키워드
${variant.keywords.join(" · ")}

## 대표 성과
${topOutcomes.map((outcome) => `- ${outcome}`).join("\n")}

## 핵심 기술 스택
${formatSkills(model)}

## 경력 요약
${companySummaries.join("\n\n")}

## 프로젝트 하이라이트
${projectHighlights.join("\n\n")}

## 오픈소스
${model.openSource
  .map((entry) => `- ${entry.title}: ${pickText(entry.contributions, entry.details[0] ?? "실사용 관점의 개선 PR 기여")}`)
  .join("\n")}

## 학력
${model.education.map((edu) => `- ${edu.title} | ${edu.period}`).join("\n")}
`;
}

function renderImpact(model, variant) {
  const topOutcomes = collectTopOutcomes(model, 10);

  const experienceBlocks = model.experiences.map((exp) => {
    const projects = exp.projects.map((project) => {
      const problem = pickText(project.context, "운영 과정에서 반복되는 병목/장애가 발생");
      const action = pickText(project.bullets, "도메인 모델링과 인터페이스 분리로 안정적인 처리 구조를 구현");
      const result = pickText(project.results, "장애 대응 시간 단축 및 운영 자동화 달성");
      return `#### ${project.title}
- 문제: ${problem}
- 해결: ${action}
- 성과: ${result}
- 사용 기술: ${project.techStack.join(", ") || "NestJS, TypeScript"}`;
    });

    return `### ${exp.company} | ${exp.role} | ${exp.period}
- 조직/도메인 맥락: ${pickText(exp.overview, "서비스 도메인 운영 안정화와 자동화를 담당")}

${projects.join("\n\n")}`;
  });

  return `# ${model.person.name} | 성과 중심 백엔드 이력서

## 연락처
${formatContactLines(model.person)}

## 요약
${model.about}

## 핵심 키워드
${variant.keywords.join(" · ")}

## 성과 지표 하이라이트
${topOutcomes.map((outcome) => `- ${outcome}`).join("\n")}

## 경력 상세 (문제-해결-성과)
${experienceBlocks.join("\n\n")}

## 기술 역량
${formatSkills(model)}

## 오픈소스 기여
${model.openSource
  .map(
    (entry) =>
      `### ${entry.title}
- 주요 기여: ${entry.contributions.join(" / ") || "실사용 기반 개선 제안"}
- 참고: ${entry.details.join(" ")}`,
  )
  .join("\n\n")}

## 학력
${model.education
  .map((edu) => `- ${edu.title} (${edu.period})${edu.details.length ? `: ${edu.details.join(", ")}` : ""}`)
  .join("\n")}
`;
}

function renderTech(model, variant) {
  const architectureBullets = [
    "도메인 로직과 인프라를 분리하는 DDD/헥사고날 성향의 구조를 선호합니다.",
    "Adapter/Strategy 패턴으로 외부 연동 포인트를 교체 가능하게 설계합니다.",
    "trackingId/결제ID 기준 멱등성 처리로 중복 실행 리스크를 억제합니다.",
    "재시도(지수 백오프), DLQ, Audit 로그를 조합해 운영 복구 시간을 단축합니다.",
    "정산/동기화 파이프라인은 스케줄러와 검증 로직으로 누락을 사전에 탐지합니다.",
  ];

  const projectTracks = model.projects.slice(0, 8).map((project) => {
    return `### ${project.title}
- 도메인: ${project.company}
- 아키텍처 포인트: ${pickText(project.bullets, "비즈니스 로직과 외부 연동 계층 분리")}
- 운영 포인트: ${pickText(project.results, "운영 안정성 및 처리 성능 개선")}
- 기술 스택: ${project.techStack.join(", ") || "NestJS, TypeScript, MySQL"}`;
  });

  return `# ${model.person.name} | 기술 특화 백엔드 이력서

## 연락처
${formatContactLines(model.person)}

## 기술자 소개
${model.about}

## 핵심 키워드
${variant.keywords.join(" · ")}

## 핵심 기술 스택 맵
${formatSkills(model)}

## 아키텍처/설계 원칙
${architectureBullets.map((item) => `- ${item}`).join("\n")}

## 트랜잭션/신뢰성 전략
- 멱등키, Retry(지수 백오프), DLQ, Slack/Webhook 알림으로 실패 전파를 차단합니다.
- 동기 파이프라인을 메시지 기반 비동기 처리로 전환하여 장애 범위를 축소합니다.
- Audit 로그와 정산 검증 스케줄러로 장애 원인과 데이터 불일치를 빠르게 추적합니다.

## 기술 프로젝트 트랙
${projectTracks.join("\n\n")}

## 오픈소스
${model.openSource
  .map(
    (entry) =>
      `- ${entry.title}: ${entry.contributions.join(" / ") || "컨텍스트 압축, 안전 업데이트, 운영 안정성 개선"}`,
  )
  .join("\n")}

## 학력
${model.education.map((edu) => `- ${edu.title} | ${edu.period}`).join("\n")}
`;
}

function renderPortfolio(model, variant) {
  const portfolioEntries = model.projects.slice(0, 10).map((project) => {
    const background = pickText(project.context, "운영 중 반복되는 병목과 수기 프로세스가 존재");
    const contribution = pickText(project.bullets, "도메인 설계, API 구현, 배포까지 엔드투엔드로 수행");
    const impact = pickText(project.results, "실패율/수기 대응을 줄이고 운영 속도를 개선");
    return `### ${project.title}
- 소속/도메인: ${project.company} (${project.period})
- 배경: ${background}
- 기여: ${contribution}
- 기술: ${project.techStack.join(", ") || "NestJS, TypeScript"}
- 임팩트: ${impact}`;
  });

  return `# ${model.person.name} | 프로젝트 포트폴리오형 이력서

## 연락처
${formatContactLines(model.person)}

## 프로필
${model.about}

## 핵심 키워드
${variant.keywords.join(" · ")}

## 포트폴리오 개요
- 경력 연차: 백엔드 4년차 (OTA/O2O 도메인)
- 강점: 문제 구조화, 도메인 모델링, 운영 자동화, 비용 최적화
- 일하는 방식: 문제 정의 → 기술 설계 → 지표 기반 검증

## 주요 프로젝트
${portfolioEntries.join("\n\n")}

## 기술 스택
${formatSkills(model)}

## 오픈소스/대외 기여
${model.openSource
  .map(
    (entry) =>
      `### ${entry.title}
- 소개: ${pickText(entry.details, "실사용 기반으로 오케스트레이션 플랫폼 개선")}
- 기여 포인트: ${entry.contributions.join(" / ") || "토큰 예산 최적화, 안전 자동 업데이트"}`
  )
  .join("\n\n")}

## 학력
${model.education.map((edu) => `- ${edu.title} | ${edu.period}`).join("\n")}
`;
}

function renderTraditional(model, variant) {
  const experienceBlocks = model.experiences.map((exp) => {
    const projectBlocks = exp.projects.map((project) => {
      const context = pickText(project.context, "운영 구조 개선이 필요한 과제를 담당");
      const results = project.results.length ? project.results.join(" / ") : "운영 효율화 및 안정성 강화";
      return `#### ${project.title}
- 업무 개요: ${context}
- 주요 수행 내용: ${pickText(project.bullets, "요구사항 분석, 도메인 설계, API 구현, 배포")}
- 사용 기술: ${project.techStack.join(", ") || "NestJS, TypeScript"}
- 성과: ${results}`;
    });

    return `### ${exp.company}
- 직무/기간: ${exp.role} | ${exp.period}
- 경력 요약: ${pickText(exp.overview, "도메인 시스템 현대화 및 운영 자동화")}

${projectBlocks.join("\n\n")}`;
  });

  return `# ${model.person.name} | 백엔드 개발자 (전통형)

## 인적사항
${formatContactLines(model.person)}

## 지원 포지션
- ${model.person.role}

## 자기소개
${model.about}

## 핵심 키워드
${variant.keywords.join(" · ")}

## 기술역량
${formatSkills(model)}

## 경력사항
${experienceBlocks.join("\n\n")}

## 오픈소스 활동
${model.openSource
  .map(
    (entry) =>
      `### ${entry.title}
- 기술: ${entry.techStack.join(", ") || "TypeScript, Node.js"}
- 활동 내용: ${entry.details.join(" ")}
- 기여 항목: ${entry.contributions.join(" / ") || "실사용 기반 개선 PR"}`
  )
  .join("\n\n")}

## 학력
${model.education
  .map((edu) => `- ${edu.title} | ${edu.period}${edu.details.length ? ` | ${edu.details.join(", ")}` : ""}`)
  .join("\n")}
`;
}

const variants = [
  {
    id: "01-minimal",
    name: "미니멀형",
    description: "간결한 한눈형 이력서",
    keywords: ["핵심성과", "운영안정성", "자동화"],
    lengthRange: [1800, 9000],
    themeClass: "theme-minimal",
    renderer: renderMinimal,
  },
  {
    id: "02-impact",
    name: "성과중심형",
    description: "문제-해결-성과 서술 중심",
    keywords: ["문제해결", "정량성과", "재현가능성"],
    lengthRange: [2500, 14000],
    themeClass: "theme-impact",
    renderer: renderImpact,
  },
  {
    id: "03-tech",
    name: "기술특화형",
    description: "아키텍처/신뢰성 전략 중심",
    keywords: ["아키텍처", "신뢰성", "확장성"],
    lengthRange: [1800, 13000],
    themeClass: "theme-tech",
    renderer: renderTech,
  },
  {
    id: "04-portfolio",
    name: "프로젝트포트폴리오형",
    description: "프로젝트 사례 중심",
    keywords: ["도메인경험", "프로젝트", "임팩트"],
    lengthRange: [2400, 15000],
    themeClass: "theme-portfolio",
    renderer: renderPortfolio,
  },
  {
    id: "05-traditional",
    name: "전통형",
    description: "국내 기업 제출용 전통 서식",
    keywords: ["경력기술서", "책임범위", "성과"],
    lengthRange: [3000, 16000],
    themeClass: "theme-traditional",
    renderer: renderTraditional,
  },
];

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const output = [];
  let inList = false;

  const closeList = () => {
    if (!inList) return;
    output.push("</ul>");
    inList = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    if (/^---+$/.test(line)) {
      closeList();
      output.push("<hr />");
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${applyInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^- (.+)$/);
    if (bullet) {
      if (!inList) {
        output.push("<ul>");
        inList = true;
      }
      output.push(`<li>${applyInlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    closeList();
    output.push(`<p>${applyInlineMarkdown(line)}</p>`);
  }

  closeList();
  return output.join("\n");
}

function buildCss(themeClass) {
  return `@page {
  size: A4;
  margin: 12mm;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 10mm;
  color: #111827;
  line-height: 1.5;
  background: #f5f7fa;
  font-family: "Apple SD Gothic Neo", "Noto Sans CJK KR", "Malgun Gothic", sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px dotted currentColor;
}

.resume {
  background: #ffffff;
  border: 1px solid #d1d5db;
  padding: 9mm 10mm;
}

.meta {
  margin-bottom: 8px;
  font-size: 11px;
  color: #4b5563;
  letter-spacing: 0.2px;
}

h1 {
  margin: 0 0 10px;
  font-size: 26px;
  line-height: 1.25;
}

h2 {
  margin: 16px 0 8px;
  font-size: 16px;
}

h3 {
  margin: 12px 0 6px;
  font-size: 14px;
}

h4 {
  margin: 10px 0 6px;
  font-size: 12px;
}

p {
  margin: 5px 0;
  font-size: 12px;
}

ul {
  margin: 4px 0 8px 0;
  padding-left: 18px;
}

li {
  margin: 3px 0;
  font-size: 12px;
}

code {
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 5px;
  background: #eef2ff;
}

hr {
  border: 0;
  border-top: 1px solid #e5e7eb;
  margin: 10px 0;
}

.theme-minimal .resume {
  border-top: 8px solid #0f172a;
}

.theme-minimal h2 {
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 2px;
}

.theme-impact body {
  background: #f1fdf4;
}

.theme-impact .resume {
  border-left: 8px solid #166534;
}

.theme-impact h2 {
  background: #166534;
  color: #ffffff;
  padding: 4px 8px;
  margin-top: 14px;
}

.theme-tech body {
  background: #eef2ff;
}

.theme-tech .resume {
  border: 1px solid #3730a3;
  background: #fdfdff;
}

.theme-tech h1,
.theme-tech h2 {
  color: #312e81;
}

.theme-tech code {
  background: #e0e7ff;
}

.theme-portfolio body {
  background: #fff5eb;
}

.theme-portfolio .resume {
  border: 2px solid #9a3412;
}

.theme-portfolio h3 {
  background: #ffedd5;
  padding: 4px 8px;
  border-radius: 6px;
}

.theme-traditional .resume {
  border: 1px solid #6b7280;
}

.theme-traditional h1 {
  text-align: center;
}

.theme-traditional h2 {
  border-bottom: 2px double #6b7280;
  padding-bottom: 2px;
}`;
}

function renderHtmlDocument(variant, markdown) {
  return `<!doctype html>
<html lang="ko" class="${variant.themeClass}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${variant.name} 이력서</title>
  <style>${buildCss(variant.themeClass)}</style>
</head>
<body>
  <main class="resume">
    <div class="meta">Generated at ${generatedAt} | Variant: ${variant.name}</div>
    ${markdownToHtml(markdown)}
    <div id="ready" style="display:none;"></div>
  </main>
</body>
</html>`;
}

function validateVariant(markdown, variant) {
  const compactLength = markdown.replace(/\s+/g, "").length;
  const hasKeywords = variant.keywords.map((keyword) => ({
    keyword,
    passed: markdown.includes(keyword),
  }));
  const inRange = compactLength >= variant.lengthRange[0] && compactLength <= variant.lengthRange[1];
  return {
    compactLength,
    inRange,
    hasKeywords,
    passed: inRange && hasKeywords.every((entry) => entry.passed),
  };
}

function generatePdfFromHtml(htmlPath, pdfPath) {
  const fileUrl = pathToFileURL(htmlPath).toString();
  execFileSync(
    "playwright",
    ["pdf", "--paper-format", "A4", "--wait-for-timeout", "200", fileUrl, pdfPath],
    { stdio: "pipe" },
  );
}

const normalized = buildNormalizedModel(sourceText);

const mandatoryStatus = {
  skill: normalized.skills.length > 0,
  experience: normalized.experiences.length > 0,
  projects: normalized.projects.length > 0,
  education: normalized.education.length > 0,
};

const duplicateSections = Object.entries(normalized.metadata.sectionCounts)
  .filter(([, count]) => count > 1)
  .map(([title, count]) => ({ title, count }));

const extractionLog = [
  `[${generatedAt}] source=${normalized.metadata.source}`,
  "",
  "[Section Counts]",
  ...Object.entries(normalized.metadata.sectionCounts).map(([title, count]) => `- ${title}: ${count}`),
  "",
  "[Mandatory Section Check]",
  `- Skill: ${mandatoryStatus.skill ? "PASS" : "FAIL"} (category=${normalized.skills.length})`,
  `- Experience: ${mandatoryStatus.experience ? "PASS" : "FAIL"} (company=${normalized.experiences.length})`,
  `- Projects: ${mandatoryStatus.projects ? "PASS" : "FAIL"} (project=${normalized.projects.length})`,
  `- Education: ${mandatoryStatus.education ? "PASS" : "FAIL"} (entry=${normalized.education.length})`,
  "",
  "[Duplicate Heading Check]",
  duplicateSections.length
    ? duplicateSections.map((item) => `- ${item.title}: ${item.count}`).join("\n")
    : "- No duplicates",
  "",
  "[Extracted Summary]",
  `- Name: ${normalized.person.name}`,
  `- Role: ${normalized.person.role}`,
  `- Contacts: ${normalized.person.contacts.length}`,
  `- OpenSource Entries: ${normalized.openSource.length}`,
].join("\n");

fs.writeFileSync(path.join(variantsRoot, "data", "normalized-resume.json"), `${JSON.stringify(normalized, null, 2)}\n`);
fs.writeFileSync(path.join(variantsRoot, "logs", "section-extraction.log"), `${extractionLog}\n`);
fs.writeFileSync(
  path.join(variantsRoot, "templates", "template-spec.json"),
  `${JSON.stringify(
    variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      description: variant.description,
      keywords: variant.keywords,
      lengthRange: variant.lengthRange,
    })),
    null,
    2,
  )}\n`,
);

const validationLines = [`[${generatedAt}] template validation`];
const pdfLogLines = [`[${generatedAt}] pdf generation`];
const generatedFiles = [];

for (const variant of variants) {
  const markdown = variant.renderer(normalized, variant).trimEnd() + "\n";
  const html = renderHtmlDocument(variant, markdown);
  const validation = validateVariant(markdown, variant);

  const markdownPath = path.join(variantsRoot, "markdown", `resume-${variant.id}.md`);
  const htmlPath = path.join(variantsRoot, "html", `resume-${variant.id}.html`);
  const pdfPath = path.join(variantsRoot, "pdf", `resume-${variant.id}.pdf`);

  fs.writeFileSync(markdownPath, markdown);
  fs.writeFileSync(htmlPath, html);

  validationLines.push(
    "",
    `- ${variant.id} (${variant.name})`,
    `  - compactLength: ${validation.compactLength} (${validation.inRange ? "PASS" : "FAIL"} range=${variant.lengthRange.join("~")})`,
    ...validation.hasKeywords.map((entry) => `  - keyword "${entry.keyword}": ${entry.passed ? "PASS" : "FAIL"}`),
    `  - overall: ${validation.passed ? "PASS" : "FAIL"}`,
  );

  generatedFiles.push(path.relative(repoRoot, markdownPath), path.relative(repoRoot, htmlPath));

  if (withPdf) {
    try {
      generatePdfFromHtml(htmlPath, pdfPath);
      pdfLogLines.push(`- ${variant.id}: PASS (${path.relative(repoRoot, pdfPath)})`);
      generatedFiles.push(path.relative(repoRoot, pdfPath));
    } catch (error) {
      pdfLogLines.push(`- ${variant.id}: FAIL (${error.message})`);
    }
  }
}

fs.writeFileSync(path.join(variantsRoot, "logs", "template-validation.log"), `${validationLines.join("\n")}\n`);
fs.writeFileSync(path.join(variantsRoot, "logs", "pdf-build.log"), `${pdfLogLines.join("\n")}\n`);

const readme = `# Resume Variant Outputs

- Source: \`docs/resume/index.md\`
- Generated at: \`${generatedAt}\`
- PDF included: \`${withPdf ? "yes" : "no"}\`

## Generated Files
${generatedFiles.map((file) => `- \`${file}\``).join("\n")}

## Build Commands
- Markdown/HTML only: \`node scripts/build-resume-variants.mjs\`
- Markdown/HTML/PDF: \`node scripts/build-resume-variants.mjs --pdf\`
`;

fs.writeFileSync(path.join(variantsRoot, "README.md"), `${readme}\n`);

const missingMandatory = Object.entries(mandatoryStatus)
  .filter(([, passed]) => !passed)
  .map(([key]) => key);

if (missingMandatory.length > 0) {
  console.error(`Mandatory section parse failed: ${missingMandatory.join(", ")}`);
  process.exit(1);
}

console.log(`Generated ${variants.length} resume variants${withPdf ? " with PDF outputs" : ""}.`);
