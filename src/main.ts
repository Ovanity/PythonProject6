import './index.css';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { RefreshCcw, BookOpen } from 'lucide-react';

const app = document.querySelector<HTMLDivElement>('#app')!;

function createLucideIcon(
  Component: React.FC<{ className?: string }>,
  className: string
): string {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(Component, { className })
  );
}

function cleanDefinitionHTML(rawHTML: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, "text/html");
  const content = doc.querySelector(".mw-parser-output");
  if (!content) return rawHTML;

  const unwantedSelectors = ['.mw-editsection', 'table', '.reference', 'sup'];
  unwantedSelectors.forEach(sel => {
    content.querySelectorAll(sel).forEach(el => el.remove());
  });

  content.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href') || "";
    if (
      a.textContent.trim().toLowerCase().includes("exemple d’utilisation") ||
      href.includes("action=edit")
    ) {
      a.remove();
    }
  });

  content.querySelectorAll('i, em').forEach(el => {
    if (el.textContent.trim().toLowerCase().includes("manquant")) {
      el.remove();
    }
  });

  let cleaned = content.innerHTML;
  cleaned = cleaned.replace(/exemple d’utilisation\s+manquant\.?\s*\(ajouter\)/gi, '');
  cleaned = cleaned.replace(/manquant\.?\s*\(ajouter\)/gi, '');
  cleaned = cleaned.replace(/manquant\.\s*\(\s*\)/gi, '');
  cleaned = cleaned.replace(/manquant\s*\(\s*\)/gi, '');
  return cleaned.trim();
}

async function fetchAllExpressions(): Promise<string[]> {
  const res = await fetch(
    'https://fr.wiktionary.org/w/api.php?action=query&list=categorymembers&cmtitle=Catégorie:Métaphores_en_russe&cmlimit=500&format=json&origin=*'
  );
  const data = await res.json();
  return data.query.categorymembers.map((entry: any) => entry.title);
}

async function fetchExpressionsList(): Promise<string[]> {
  const cached = localStorage.getItem("expressionsAll");
  if (cached) return JSON.parse(cached);
  const all = await fetchAllExpressions();
  localStorage.setItem("expressionsAll", JSON.stringify(all));
  return all;
}

async function fetchFullPage(title: string): Promise<string> {
  const res = await fetch(
    `https://fr.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`
  );
  const data = await res.json();
  return data.parse.text["*"];
}

function renderExpression(title: string, rawDefinitionHtml: string): void {
  const definitionHtml = cleanDefinitionHTML(rawDefinitionHtml);
  const iconTitle = createLucideIcon(BookOpen, 'w-6 h-6 text-indigo-300 inline-block mr-2 -mt-1 drop-shadow-glow');
  const iconReload = createLucideIcon(RefreshCcw, 'w-4 h-4 text-white inline-block mr-2 -mt-1');

  app.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
      <div class="w-full max-w-3xl max-h-[90vh] overflow-y-auto scroll-smooth rounded-3xl border border-gray-700 shadow-[0_0_60px_rgba(99,102,241,0.3)] bg-gradient-to-tr from-gray-800/60 to-gray-900/60 backdrop-blur-md p-6 sm:p-8 md:p-10 animate-fadeIn flex flex-col">

        <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center text-white mb-4 drop-shadow-[0_0_10px_#6366f1] flex items-center justify-center gap-3">
          ${iconTitle}
          <span class="tracking-tight animate-pulse">Expression Russe</span>
        </h1>

        <h2 class="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-indigo-300 mb-6 tracking-wide uppercase drop-shadow">
          ${title}
        </h2>

        <div class="prose prose-invert max-w-none text-white/90 mb-8 text-justify leading-relaxed">
          ${definitionHtml}
        </div>

        <div class="flex justify-center">
          <button id="reload"
            class="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xl ring-1 ring-indigo-400/30 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_#6366f1] flex items-center gap-2">
            ${iconReload} Voir une autre expression
          </button>
        </div>

        <footer class="mt-8 text-center text-sm text-gray-500 tracking-wider opacity-70 select-none">
          MARTIN. 2025
        </footer>
      </div>
    </div>
  `;

  document.getElementById('reload')?.addEventListener('click', () => {
    showRandomExpression();
  });
}

async function showRandomExpression(): Promise<void> {
  try {
    const expressions = await fetchExpressionsList();
    const randomIndex = Math.floor(Math.random() * expressions.length);
    const title = expressions[randomIndex];
    const fullHtml = await fetchFullPage(title);
    renderExpression(title, fullHtml);
  } catch (err) {
    app.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-red-900 text-red-400 font-semibold p-6 text-center">
        Erreur de chargement : ${err}
      </div>
    `;
  }
}

showRandomExpression();