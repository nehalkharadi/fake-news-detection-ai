const form = document.getElementById("analyzeForm");
const resultPanel = document.getElementById("resultPanel");
const resetButton = document.getElementById("resetButton");
const revealNodes = document.querySelectorAll(".reveal");
const scene = document.getElementById("scene");
const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const sourceUrlInput = document.getElementById("source_url");
const sampleGrid = document.getElementById("sampleGrid");

const sampleStories = [
    {
        title: "Health ministry releases nationwide report on seasonal flu admissions",
        content:
            "The ministry published a report on April 18 with hospital admission data from 42 districts. Officials said the increase matched seasonal expectations, and independent researchers reviewing the figures said the outbreak remains manageable with standard precautions.\n\nThe statement included district-by-district totals, comments from public hospitals, and links to the advisory notice.",
        source_url: "https://www.reuters.com/world/health/",
    },
    {
        title: "SHOCKING SECRET CURE hidden by mainstream media will end every disease overnight!!!",
        content:
            "An anonymous insider revealed a miracle formula that doctors never want you to know about. Everyone must share this now before the post gets deleted. No documents were provided, but the claim says the cure is already proven 100% effective.",
        source_url: "https://viral-truth-blogspot.com/miracle-cure",
    },
    {
        title: "City claims new traffic AI reduced accidents by 17 percent in pilot zone",
        content:
            "A municipal statement said accident reports fell in a three-month pilot. The article references police data but does not link the report directly, and the quoted study authors were not named. Residents gave mixed responses about whether the change is sustainable.",
        source_url: "https://city-transport-updates.org/news/ai-pilot",
    },
];

const sensationalKeywords = [
    "shocking",
    "secret",
    "miracle",
    "exposed",
    "breaking",
    "viral",
    "bombshell",
    "unbelievable",
    "must read",
    "share now",
    "urgent",
    "explosive",
    "hidden truth",
    "exclusive leak",
];

const evidenceKeywords = [
    "according to",
    "report",
    "study",
    "research",
    "data",
    "official",
    "statement",
    "confirmed",
    "documents",
    "analysis",
    "agency",
    "court",
    "interview",
    "press release",
    "investigation",
];

const absoluteClaimKeywords = [
    "always",
    "never",
    "everyone knows",
    "100%",
    "guaranteed",
    "no doubt",
    "proved once and for all",
    "must share",
];

const conspiracyKeywords = [
    "cover-up",
    "they do not want you to know",
    "hidden agenda",
    "deep state",
    "secret cure",
    "mainstream media is hiding",
    "suppressed",
    "inside job",
];

const credibleDomains = {
    "reuters.com": 20,
    "apnews.com": 19,
    "bbc.com": 18,
    "bbc.co.uk": 18,
    "theguardian.com": 14,
    "nytimes.com": 14,
    "washingtonpost.com": 13,
    "nasa.gov": 20,
    "nih.gov": 20,
    "who.int": 20,
    "un.org": 18,
    "worldbank.org": 18,
    "data.gov": 16,
};

const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        };
        return entities[char] || char;
    });

let audioCtx = null;

const playTypingSound = () => {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600 + Math.random() * 400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.03);
    } catch (e) {
        // Fallback for audio disabled
    }
};

const typeWriterHtml = async (element, html, speed = 8) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    element.innerHTML = '';

    const processNode = async (node, parent) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            const textNode = document.createTextNode('');
            parent.appendChild(textNode);
            for (let i = 0; i < text.length; i++) {
                textNode.textContent += text[i];
                if (text[i].trim() !== '') {
                    playTypingSound();
                    await new Promise(r => setTimeout(r, speed));
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const clone = node.cloneNode(false);
            parent.appendChild(clone);
            for (const child of Array.from(node.childNodes)) {
                await processNode(child, clone);
            }
        }
    };

    for (const child of Array.from(tempDiv.childNodes)) {
        await processNode(child, element);
    }
};

const renderInitialState = async () => {
    resultPanel.classList.remove("is-loading");
    await typeWriterHtml(resultPanel, `
        <div class="result-empty">
            <div class="pulse-orb"></div>
            <p class="result-overline">Awaiting input</p>
            <h3>Drop a story into the detector</h3>
            <p>
                Your result will appear here with a live trust score, fake-risk score, confidence,
                signal breakdown, and a fact-check checklist.
            </p>
        </div>
    `, 5);
};

const excerpt = (text, limit = 160) => {
    if (text.length <= limit) {
        return text;
    }

    return `${text.slice(0, limit - 3).trimEnd()}...`;
};

const countWords = (text) => {
    const cleaned = text.replace(/[^\p{L}\p{N}\s]+/gu, " ");
    const parts = cleaned.trim().split(/\s+/u).filter(Boolean);
    return parts.length;
};

const countKeywordHits = (text, keywords) => keywords.reduce((hits, keyword) => hits + (text.includes(keyword) ? 1 : 0), 0);

const formatSignals = (signals) =>
    signals
        .sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact))
        .map((signal) => ({
            label: signal.label,
            impact: signal.impact,
            impact_label: `${signal.impact >= 0 ? "+" : ""}${signal.impact}`,
            tone: signal.tone,
            detail: signal.detail,
        }));

const assessSource = (sourceUrl) => {
    if (!sourceUrl) {
        return null;
    }

    let host = "";

    try {
        host = new URL(sourceUrl).host.toLowerCase().replace(/^www\./, "");
    } catch (error) {
        return {
            label: "Invalid source URL",
            impact: -8,
            tone: "negative",
            detail: "The supplied source URL is not valid, so the publisher cannot be verified.",
        };
    }

    for (const [domain, impact] of Object.entries(credibleDomains)) {
        if (host === domain || host.endsWith(`.${domain}`)) {
            return {
                label: "Trusted source domain",
                impact,
                tone: "positive",
                detail: `${host} matches a curated domain with a strong editorial reputation.`,
            };
        }
    }

    if (host.endsWith(".gov") || host.includes(".gov.")) {
        return {
            label: "Government source",
            impact: 16,
            tone: "positive",
            detail: "Government domains often publish primary-source statements and datasets.",
        };
    }

    if (host.endsWith(".edu")) {
        return {
            label: "Academic source",
            impact: 12,
            tone: "positive",
            detail: "Academic publishers usually offer more traceable evidence than anonymous sites.",
        };
    }

    if (/blogspot|wordpress|rumor|viral|buzz|shock|truth/i.test(host)) {
        return {
            label: "Low-trust source pattern",
            impact: -10,
            tone: "negative",
            detail: "The domain name pattern resembles click-driven or weakly sourced publishing sites.",
        };
    }

    return {
        label: "Unrecognized source",
        impact: 2,
        tone: "neutral",
        detail: `${host} is not in the trusted-domain list, so credibility depends more on the story content.`,
    };
};

const resolveVerdict = (score) => {
    if (score >= 72) {
        return {
            label: "Likely Real",
            description: "The story shows stronger source and evidence signals than misinformation signals.",
            tone: "positive",
            color: "#57f287",
        };
    }

    if (score >= 45) {
        return {
            label: "Needs Verification",
            description: "Some signals look credible, but the article still needs manual fact-checking.",
            tone: "warning",
            color: "#ffd166",
        };
    }

    return {
        label: "High Fake Risk",
        description: "The story contains multiple patterns often found in misleading or fabricated posts.",
        tone: "danger",
        color: "#ff6b6b",
    };
};

const calculateConfidence = (score, wordCount, hasSource) => {
    const distanceFromMiddle = Math.abs(score - 50);
    let confidence = 56 + Math.round(distanceFromMiddle * 0.75);

    if (wordCount > 120) {
        confidence += 6;
    } else if (wordCount < 45) {
        confidence -= 8;
    }

    if (hasSource) {
        confidence += 4;
    }

    return Math.max(44, Math.min(96, confidence));
};

const buildInsights = (label, score, sourceAssessment, wordCount, sensationalHits, evidenceHits) => {
    const insights = [`SignalMatrix AI assigned a trust score of ${score}/100, which maps to the verdict "${label}".`];

    if (sourceAssessment) {
        insights.push(sourceAssessment.detail);
    } else {
        insights.push("Adding the original source URL would improve traceability and sharpen the result.");
    }

    if (sensationalHits > evidenceHits) {
        insights.push("The wording leans more emotional than evidential, so external fact-checking is strongly recommended.");
    } else if (evidenceHits > 0) {
        insights.push("The article contains enough reporting-style signals to support a more credible interpretation.");
    } else {
        insights.push("The text lacks strong evidence markers, so the output should be treated as an early warning signal only.");
    }

    if (wordCount < 60) {
        insights.push("Short content lowers model confidence because there is less context to inspect.");
    }

    return insights.slice(0, 4);
};

const buildRecommendations = (score, hasSource, sensationalHits, evidenceHits) => {
    const recommendations = [];

    if (!hasSource) {
        recommendations.push("Add the publisher URL or original post link before trusting the claim.");
    }

    if (score < 45) {
        recommendations.push("Cross-check the headline with reputable outlets and a dedicated fact-checking site.");
    }

    if (sensationalHits > 0) {
        recommendations.push("Look for emotional or urgency-based phrases that push readers to react before verifying.");
    }

    if (evidenceHits === 0) {
        recommendations.push("Search for named reports, official statements, or data that directly support the claim.");
    }

    if (recommendations.length === 0) {
        recommendations.push("Use the listed evidence signals to validate the article with at least one independent source.");
    }

    return recommendations.slice(0, 4);
};

const analyzePayload = (payload) => {
    const title = (payload.title || "").trim();
    const content = (payload.content || "").trim();
    const sourceUrl = (payload.source_url || "").trim();

    if (!title && !content) {
        throw new Error("A headline or article body is required.");
    }

    const joinedText = `${title} ${content}`.trim();
    const normalizedText = joinedText.toLowerCase();
    const wordCount = countWords(joinedText);
    const paragraphCount = Math.max(1, content.split(/\n\s*\n/u).filter(Boolean).length || 1);
    const alphaCount = (joinedText.match(/[a-z]/gi) || []).length;
    const upperCount = (joinedText.match(/[A-Z]/g) || []).length;
    const capsRatio = alphaCount > 0 ? upperCount / alphaCount : 0;
    const exclamationCount = (joinedText.match(/!/g) || []).length;
    const questionCount = (joinedText.match(/\?/g) || []).length;
    const quoteCount = (joinedText.match(/["']/g) || []).length;
    const numberCount = (joinedText.match(/\b\d+(?:[.,]\d+)?\b/gu) || []).length;
    const dateCount = (joinedText.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/giu) || []).length;

    let score = 50;
    const signalBreakdown = [];

    const sourceAssessment = assessSource(sourceUrl);
    if (sourceAssessment) {
        score += sourceAssessment.impact;
        signalBreakdown.push(sourceAssessment);
    } else {
        score -= 4;
        signalBreakdown.push({
            label: "Missing source link",
            impact: -4,
            tone: "negative",
            detail: "No publisher URL was supplied, so source credibility could not be checked.",
        });
    }

    const evidenceHits = countKeywordHits(normalizedText, evidenceKeywords);
    if (evidenceHits > 0) {
        const impact = Math.min(16, 6 + evidenceHits * 2);
        score += impact;
        signalBreakdown.push({
            label: "Evidence language",
            impact,
            tone: "positive",
            detail: "The story uses report, data, or attribution-style wording that usually appears in sourced journalism.",
        });
    }

    const sensationalHits = countKeywordHits(normalizedText, sensationalKeywords);
    if (sensationalHits > 0) {
        const impact = -Math.min(26, 5 + sensationalHits * 3);
        score += impact;
        signalBreakdown.push({
            label: "Sensational framing",
            impact,
            tone: "negative",
            detail: "Attention-grabbing phrases can indicate emotional manipulation over verifiable reporting.",
        });
    }

    const absoluteHits = countKeywordHits(normalizedText, absoluteClaimKeywords);
    if (absoluteHits > 0) {
        const impact = -Math.min(16, 4 + absoluteHits * 4);
        score += impact;
        signalBreakdown.push({
            label: "Absolute claims",
            impact,
            tone: "negative",
            detail: "Sweeping certainty without nuance is a common misinformation pattern.",
        });
    }

    const conspiracyHits = countKeywordHits(normalizedText, conspiracyKeywords);
    if (conspiracyHits > 0) {
        const impact = -Math.min(20, 8 + conspiracyHits * 5);
        score += impact;
        signalBreakdown.push({
            label: "Conspiracy indicators",
            impact,
            tone: "negative",
            detail: "The article includes language commonly associated with unsupported conspiracy narratives.",
        });
    }

    if (wordCount < 45) {
        score -= 10;
        signalBreakdown.push({
            label: "Very short submission",
            impact: -10,
            tone: "negative",
            detail: "Short snippets rarely provide enough context for a strong credibility signal.",
        });
    } else if (wordCount > 180) {
        score += 6;
        signalBreakdown.push({
            label: "Detailed article body",
            impact: 6,
            tone: "positive",
            detail: "Longer text gives the model more context and often includes more traceable claims.",
        });
    }

    if (capsRatio > 0.22) {
        score -= 12;
        signalBreakdown.push({
            label: "Heavy all-caps use",
            impact: -12,
            tone: "negative",
            detail: "Aggressive capital letters often appear in manipulative or low-quality posts.",
        });
    } else if (capsRatio > 0.12) {
        score -= 6;
        signalBreakdown.push({
            label: "Elevated caps ratio",
            impact: -6,
            tone: "negative",
            detail: "Some emphasis is present, but it is still stronger than standard reporting tone.",
        });
    }

    if (exclamationCount >= 3) {
        score -= 8;
        signalBreakdown.push({
            label: "Exclamation overload",
            impact: -8,
            tone: "negative",
            detail: "Frequent exclamation marks can be a signal of hype-driven content.",
        });
    }

    if (questionCount >= 3) {
        score -= 4;
        signalBreakdown.push({
            label: "Question-bait wording",
            impact: -4,
            tone: "negative",
            detail: "Stacked questions are often used to imply claims without direct proof.",
        });
    }

    if (numberCount >= 2) {
        score += 5;
        signalBreakdown.push({
            label: "Quantitative detail",
            impact: 5,
            tone: "positive",
            detail: "Specific numbers can help a claim become easier to verify.",
        });
    }

    if (dateCount >= 1) {
        score += 3;
        signalBreakdown.push({
            label: "Time reference found",
            impact: 3,
            tone: "positive",
            detail: "Concrete dates or time references make a story easier to fact-check.",
        });
    }

    if (quoteCount >= 4) {
        score += 4;
        signalBreakdown.push({
            label: "Quoted language",
            impact: 4,
            tone: "positive",
            detail: "Quoted statements suggest attribution to a named source or witness.",
        });
    }

    if (paragraphCount >= 3) {
        score += 4;
        signalBreakdown.push({
            label: "Structured writing",
            impact: 4,
            tone: "positive",
            detail: "Multi-paragraph structure usually indicates a fuller report instead of a raw claim.",
        });
    }

    score = Math.max(8, Math.min(96, score));
    const confidence = calculateConfidence(score, wordCount, Boolean(sourceUrl));
    const risk = 100 - score;
    const verdict = resolveVerdict(score);

    return {
        ok: true,
        input: {
            title,
            content,
            source_url: sourceUrl,
        },
        verdict,
        scores: {
            trust: score,
            risk,
            confidence,
        },
        metrics: {
            word_count: wordCount,
            caps_ratio: Number((capsRatio * 100).toFixed(1)),
            exclamation_count: exclamationCount,
            evidence_hits: evidenceHits,
            sensational_hits: sensationalHits,
        },
        signalBreakdown: formatSignals(signalBreakdown),
        insights: buildInsights(verdict.label, score, sourceAssessment, wordCount, sensationalHits, evidenceHits),
        recommendations: buildRecommendations(score, Boolean(sourceAssessment), sensationalHits, evidenceHits),
        model: {
            name: "SignalMatrix AI",
            summary: "This frontend model blends source reputation, evidence density, tone, structure, and risk signals to produce an explainable credibility estimate.",
        },
    };
};

const renderLoadingState = async () => {
    resultPanel.classList.add("is-loading");
    await typeWriterHtml(resultPanel, `
        <div class="result-empty">
            <div class="pulse-orb"></div>
            <p class="result-overline">SignalMatrix AI</p>
            <h3>Scanning source and language patterns...</h3>
            <p>
                Inspecting credibility signals, sensational wording, evidence density, and source reputation.
            </p>
        </div>
    `, 5);
};

const renderErrorState = async (message) => {
    resultPanel.classList.remove("is-loading");
    await typeWriterHtml(resultPanel, `
        <div class="result-shell">
            <div class="result-header">
                <div>
                    <p class="result-overline">Detector Error</p>
                    <h3>Request could not be processed</h3>
                    <p class="result-description">${escapeHtml(message)}</p>
                </div>
                <span class="status-pill tone-danger">Check Input</span>
            </div>
        </div>
    `, 5);
};

const renderResult = async (data) => {
    resultPanel.classList.remove("is-loading");

    const trust = data.scores.trust;
    const risk = data.scores.risk;
    const confidence = data.scores.confidence;
    const toneClass = `tone-${data.verdict.tone}`;
    const meterAngle = `${Math.round((trust / 100) * 360)}deg`;
    const meterColor = data.verdict.color;

    const signalsHtml = data.signalBreakdown
        .map((signal) => {
            const impactClass =
                signal.impact > 0 ? "impact-positive" : signal.impact < 0 ? "impact-negative" : "impact-neutral";

            return `
                <li class="signal-item">
                    <span class="impact ${impactClass}">${escapeHtml(signal.impact_label)}</span>
                    <div class="signal-copy">
                        <strong>${escapeHtml(signal.label)}</strong>
                        <p>${escapeHtml(signal.detail)}</p>
                    </div>
                    <span class="result-overline">${escapeHtml(signal.tone)}</span>
                </li>
            `;
        })
        .join("");

    const insightsHtml = data.insights
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");

    const recommendationsHtml = data.recommendations
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");

    const finalHtml = `
        <div class="result-shell">
            <div class="result-header">
                <div>
                    <p class="result-overline">Scan Result</p>
                    <h3>${escapeHtml(data.verdict.label)}</h3>
                    <p class="result-description">${escapeHtml(data.verdict.description)}</p>
                </div>
                <span class="status-pill ${toneClass}">${escapeHtml(data.verdict.label)}</span>
            </div>

            <div class="meter-grid">
                <div class="meter-ring" style="--meter-angle: ${meterAngle}; --meter-color: ${meterColor};">
                    <div class="meter-core">
                        <strong>${trust}</strong>
                        <span>Trust Score</span>
                    </div>
                </div>

                <div class="mini-metrics">
                    <div class="mini-metric">
                        <span>Fake Risk</span>
                        <strong>${risk}%</strong>
                    </div>
                    <div class="mini-metric">
                        <span>Confidence</span>
                        <strong>${confidence}%</strong>
                    </div>
                    <div class="mini-metric">
                        <span>Words</span>
                        <strong>${data.metrics.word_count}</strong>
                    </div>
                    <div class="mini-metric">
                        <span>Evidence Hits</span>
                        <strong>${data.metrics.evidence_hits}</strong>
                    </div>
                </div>
            </div>

            <section class="result-block">
                <h4>Signal Breakdown</h4>
                <ul class="signal-list">${signalsHtml}</ul>
            </section>

            <section class="result-block">
                <h4>Insights</h4>
                <ul class="insight-list">${insightsHtml}</ul>
            </section>

            <section class="result-block">
                <h4>Fact-Check Checklist</h4>
                <ul class="recommendation-list">${recommendationsHtml}</ul>
            </section>

            <div class="result-meta">
                <span class="result-subtitle">${escapeHtml(data.model.summary)}</span>
                <code>${escapeHtml(data.model.name)}</code>
            </div>
        </div>
    `;

    await typeWriterHtml(resultPanel, finalHtml, 4);
};

const loadStoryIntoForm = (story) => {
    titleInput.value = story.title || "";
    contentInput.value = story.content || "";
    sourceUrlInput.value = story.source_url || "";
    document.getElementById("detector").scrollIntoView({ behavior: "smooth", block: "start" });
};

const renderSampleCards = () => {
    sampleGrid.innerHTML = sampleStories
        .map(
            (story, index) => `
                <article class="sample-card">
                    <h3>${escapeHtml(story.title)}</h3>
                    <p>${escapeHtml(excerpt(story.content))}</p>
                    <button type="button" class="sample-button" data-index="${index}">Load This Story</button>
                </article>
            `
        )
        .join("");

    sampleGrid.querySelectorAll(".sample-button").forEach((button) => {
        button.addEventListener("click", () => {
            const story = sampleStories[Number(button.dataset.index)];
            loadStoryIntoForm(story);
        });
    });
};

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Prevent re-submitting while loading
    if (resultPanel.classList.contains("is-loading")) return;

    await renderLoadingState();

    const payload = {
        title: titleInput.value.trim(),
        content: contentInput.value.trim(),
        source_url: sourceUrlInput.value.trim(),
    };

    if (!payload.title && !payload.content) {
        await renderErrorState("Please enter a headline or article content before scanning.");
        return;
    }

    try {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        const data = analyzePayload(payload);
        await renderResult(data);
    } catch (error) {
        await renderErrorState(error.message || "Unexpected error");
    }
});

resetButton.addEventListener("click", () => {
    window.setTimeout(renderInitialState, 30);
});

const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
            }
        });
    },
    {
        threshold: 0.15,
    }
);

revealNodes.forEach((node, index) => {
    node.style.transitionDelay = `${Math.min(index * 80, 320)}ms`;
    revealObserver.observe(node);
});

if (scene) {
    scene.addEventListener("mousemove", (event) => {
        const rect = scene.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateY = (x - 0.5) * 16;
        const rotateX = (0.5 - y) * 16;
        scene.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    scene.addEventListener("mouseleave", () => {
        scene.style.transform = "rotateX(0deg) rotateY(0deg)";
    });
}

renderSampleCards();
renderInitialState();
