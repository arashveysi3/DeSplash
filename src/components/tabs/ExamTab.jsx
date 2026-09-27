import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { ProgressBar } from 'baseui/progress-bar';
import { Heading } from 'baseui/heading';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import { BANK_META, findReadingText } from '../../data/exam.js';
import { EXAM_SECTION_LABELS, EXAM_SECTIONS, EXAM_MODE_COUNTS, examModeTotal, examModeLabel, readExamBest } from '../../utils/exam.js';
import { speakGerman } from '../../utils/speak';
import UberCard from '../cards/UberCard.jsx';
import {
  Award,
  BookMarked,
  BookOpen,
  Check,
  CheckCircle2,
  CircleX,
  GraduationCap,
  Info,
  Languages,
  RotateCcw,
  Sparkles,
  Target,
  ICON_SIZES,
} from '../icons.jsx';

const SECTION_ICONS = {
  diktation: CheckCircle2,
  grammatik: BookOpen,
  wortschatz: Languages,
  lesen: BookMarked,
};

const SECTION_MODES = ['diktation', 'grammatik', 'wortschatz', 'lesen'];

function SectionRow({ sectionKey, count }) {
  const Icon = SECTION_ICONS[sectionKey] || BookOpen;
  return (
    <Block display="flex" justifyContent="space-between" alignItems="center" padding="10px 0" overrides={{ Block: { style: { borderBottom: '1px solid #f1f1f3' } } }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13 }}>
        <span style={{ display: 'inline-flex', padding: 6, borderRadius: 999, background: '#f7f7fb', border: '1px solid #e9e8f0' }}>
          <Icon size={14} aria-hidden="true" style={{ color: '#0f0f12' }} />
        </span>
        {EXAM_SECTION_LABELS[sectionKey]}
      </span>
      <span style={{ fontWeight: 800, fontSize: 13 }}>{count} Fragen</span>
    </Block>
  );
}

function readingTextFor(question) {
  if (!question || question.section !== 'lesen' || !question.textId) return null;
  return findReadingText(question.textId);
}

function bestLine(best) {
  if (!best) return 'Noch kein Versuch';
  return `Bestleistung: ${best.correct}/${best.total} (${best.pct}%)`;
}

export default function ExamTab(props) {
  const {
    examStarted,
    examQuestions,
    examIdx,
    examPicks,
    examResult,
    examMode,
    examFinishing,
    onStartExam,
    onExamPick,
    onExamNav,
    onRetakeExam,
    onExitExam,
    onPracticeWeak,
    onGoToBooks,
  } = props;

  // ---------------------------------------------------------- result screen
  if (examResult) {
    const { score, analysis, bonus, isNewBest } = examResult;
    const mode = examResult.mode || examMode || 'full';
    const incorrect = (score.results || []).filter((r) => !r.correct);
    const byId = new Map((examQuestions || []).map((q) => [q.id, q]));
    const presentSections = EXAM_SECTIONS.filter((s) => (score.perSection[s] || { total: 0 }).total > 0);
    return (
      <>
        <UberCard styleOverride={{ background: 'linear-gradient(135deg,#0f0f12 0%,#2a2a3a 60%,#4f46e5 100%)', color: '#fff', borderWidth: 0, textAlign: 'center', paddingTop: '20px', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', padding: 10, borderRadius: 999, background: 'rgba(255,255,255,0.14)' }}>
              <Award size={ICON_SIZES.hero} aria-hidden="true" style={{ color: '#fff' }} />
            </span>
          </div>
          <Heading $style={{ fontSize: 18, margin: '8px 0 0', color: '#fff' }}>{examModeLabel(mode)}</Heading>
          <div style={{ fontSize: 40, fontWeight: 800, marginTop: 6, letterSpacing: '-1px' }}>{score.correct}<span style={{ fontSize: 20, opacity: 0.7 }}>/{score.total}</span></div>
          <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 700 }}>{score.pct}%{isNewBest ? ' • Neue Bestleistung!' : ''}{bonus > 0 ? ` • +${bonus} XP` : ''}</div>
        </UberCard>

        <UberCard styleOverride={{ marginTop: '12px', paddingTop: '12px', paddingBottom: '12px' }}>
          <LabelSmall color="#6b6b6b">Teil-Ergebnisse</LabelSmall>
          <Block marginTop="6px">
            {presentSections.map((key) => {
              const sec = score.perSection[key] || { total: 0, correct: 0, accuracy: null };
              const Icon = SECTION_ICONS[key] || BookOpen;
              const label = EXAM_SECTION_LABELS[key];
              return (
                <Block key={key} display="flex" justifyContent="space-between" alignItems="center" padding="8px 0" overrides={{ Block: { style: { borderBottom: '1px solid #f1f1f3' } } }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                    <Icon size={14} aria-hidden="true" style={{ color: '#6b6b7a' }} /> {label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{sec.correct}/{sec.total}{sec.accuracy !== null ? ` • ${sec.accuracy}%` : ''}</span>
                </Block>
              );
            })}
          </Block>
        </UberCard>

        <UberCard styleOverride={{ marginTop: '12px', paddingTop: '12px', paddingBottom: '12px', borderColor: '#e9e8f0' }}>
          <Block display="flex" alignItems="center" gridGap="6px">
            <Target size={14} aria-hidden="true" style={{ color: '#dc2626' }} />
            <LabelSmall color="#000" overrides={{ Block: { style: { fontWeight: 800 } } }}>Needs practice</LabelSmall>
          </Block>
          {analysis && (analysis.weakTopics.length > 0 || analysis.weakLektions.length > 0) ? (
            <Block display="flex" gridGap="6px" marginTop="8px" overrides={{ Block: { style: { flexWrap: 'wrap' } } }}>
              {analysis.weakTopics.map((t) => (
                <span key={`t-${t.label}`} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                  {t.label} • {t.incorrect}/{t.total} falsch
                </span>
              ))}
              {analysis.weakLektions.map((l) => (
                <span key={`l-${l.label}`} style={{ background: '#f7f7fb', border: '1px solid #e9e8f0', color: '#0f0f12', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                  {l.label} • {l.incorrect}/{l.total} falsch
                </span>
              ))}
            </Block>
          ) : (
            <ParagraphSmall color="#16a34a" margin="8px 0 0">Stark in allen Bereichen — keine klaren Schwächen in dieser Prüfung.</ParagraphSmall>
          )}
        </UberCard>

        <Heading $style={{ fontSize: 16, margin: '16px 0 8px' }}>Review — {incorrect.length} falsch</Heading>
        {incorrect.length === 0 ? (
          <UberCard styleOverride={{ textAlign: 'center', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><CheckCircle2 size={ICON_SIZES.empty} aria-hidden="true" style={{ color: '#16a34a' }} /></div>
            <ParagraphSmall margin="8px 0 0"><b>Fehlerfrei!</b> Alle {score.total} Fragen richtig — herausragend.</ParagraphSmall>
          </UberCard>
        ) : (
          <Block display="flex" flexDirection="column" gridGap="8px">
            {incorrect.map((r) => {
              const q = byId.get(r.questionId);
              if (!q) return null;
              const text = readingTextFor(q);
              return (
                <UberCard key={r.questionId} styleOverride={{ borderColor: '#fecaca', paddingTop: '12px', paddingBottom: '12px' }}>
                  <Block display="flex" justifyContent="space-between" alignItems="center">
                    <LabelSmall color="#6b6b6b">{EXAM_SECTION_LABELS[q.section]}{q.topic ? ` • ${q.topic}` : ''}{q.lektion ? ` • ${q.lektion}` : ''}</LabelSmall>
                    <CircleX size={14} aria-hidden="true" style={{ color: '#dc2626', flexShrink: 0 }} />
                  </Block>
                  {text && <div style={{ fontSize: 11, color: '#9aa0b2', marginTop: 2 }}>Text: {text.title}</div>}
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>{q.prompt}</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>Deine Antwort: </span>
                    <span>{r.picked || '— (übersprungen)'}</span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>Richtig: </span>
                    <span style={{ fontWeight: 700 }}>{q.answer}</span>
                  </div>
                  {q.explanation && (
                    <div style={{ fontSize: 12, color: '#4b4b55', marginTop: 6, background: '#f7f7fb', borderRadius: 10, padding: '8px 10px' }}>{q.explanation}</div>
                  )}
                </UberCard>
              );
            })}
          </Block>
        )}

        <Block display="flex" gridGap="8px" marginTop="16px" overrides={{ Block: { style: { flexWrap: 'wrap' } } }}>
          <Button shape={SHAPE.pill} onClick={onRetakeExam}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><RotateCcw size={14} aria-hidden="true" /> Neu mischen & erneut versuchen</span></Button>
          <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onPracticeWeak}>Schwache Wörter üben</Button>
          <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onGoToBooks}>Bücher</Button>
        </Block>
      </>
    );
  }

  // ---------------------------------------------------------- question screen
  if (examStarted && examQuestions && examQuestions.length > 0) {
    const q = examQuestions[examIdx];
    if (!q) return null;
    const text = readingTextFor(q);
    const picked = examPicks[q.id] ?? null;
    const answered = Object.keys(examPicks).length;
    const isLast = examIdx + 1 >= examQuestions.length;
    return (
      <>
        <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
          <LabelSmall color="#6b6b6b">{EXAM_SECTION_LABELS[q.section]} • Frage {examIdx + 1}/{examQuestions.length}</LabelSmall>
          <LabelSmall color="#000" overrides={{ Block: { style: { fontWeight: 700 } } }}>{answered}/{examQuestions.length} beantwortet</LabelSmall>
        </Block>
        <ProgressBar value={(examIdx / examQuestions.length) * 100} overrides={{ BarProgress: { style: { backgroundColor: '#0f0f12' } }, BarContainer: { style: { backgroundColor: '#eee', height: '4px', borderRadius: '999px' } }, Bar: { style: { height: '4px' } } }} />
        <UberCard key={q.id} styleOverride={{ marginTop: '12px', minHeight: '280px' }} className="gs-exam-card">
          <Block textAlign="center">
            <LabelSmall color="#6b6b6b">
              {q.section === 'diktation'
                ? (q.kind === 'find-error' ? 'DIKTATION — Welches ist FALSCH geschrieben?' : 'DIKTATION — Welches ist RICHTIG geschrieben?')
                : `${EXAM_SECTION_LABELS[q.section].toUpperCase()}${q.topic ? ` — ${q.topic}` : ''}`}
            </LabelSmall>
            {text && (
              <div style={{ textAlign: 'left', background: '#f7f7fb', border: '1px solid #e9e8f0', borderRadius: 14, padding: '12px 14px', marginTop: 10, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                <div style={{ fontSize: 11, letterSpacing: 1, color: '#9aa0b2', fontWeight: 800, marginBottom: 4 }}>{text.kind.toUpperCase()} — {text.title}</div>
                {text.text}
              </div>
            )}
            <div style={{ fontSize: q.section === 'grammatik' || q.section === 'wortschatz' ? 17 : 15, fontWeight: 700, marginTop: 10, lineHeight: 1.4 }}>{q.prompt}</div>
            {q.section === 'diktation' && q.kind === 'find-correct' && q.hint && (
              <>
                <div style={{ fontSize: 13, color: '#6b6b7a', marginTop: 4 }}>{q.hint.en}</div>
                <Block marginTop="8px">
                  <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={() => speakGerman(q.answer)} aria-label="Wort anhören">Anhören</Button>
                </Block>
              </>
            )}
            {q.section === 'diktation' && q.kind === 'find-error' && (
              <div style={{ fontSize: 12, color: '#6b6b7a', marginTop: 4 }}>3 sind richtig geschrieben — 1 hat einen Fehler.</div>
            )}
          </Block>
          <Block display="flex" flexDirection="column" gridGap="8px" marginTop="14px" role="group" aria-label="Antwortmöglichkeiten">
            {(q.shuffledOptions || []).map((opt) => {
              const selected = picked === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onExamPick && onExamPick(opt)}
                  aria-pressed={selected}
                  className="gs-exam-option"
                  style={{
                    backgroundColor: selected ? '#0f0f12' : '#fff',
                    color: selected ? '#fff' : '#0f0f12',
                    border: selected ? '1.8px solid #0f0f12' : '1.8px solid #e9e8f0',
                    borderRadius: 14,
                    minHeight: 56,
                    padding: '12px 14px',
                    fontWeight: selected ? 800 : 600,
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    lineHeight: 1.3,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      border: selected ? '2px solid #fff' : '2px solid #d4d4d8',
                      background: selected ? '#16a34a' : 'transparent',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {selected && <Check size={13} aria-hidden="true" />}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </Block>
        </UberCard>
        <Block display="flex" gridGap="8px" marginTop="12px">
          <Button kind={KIND.secondary} shape={SHAPE.pill} disabled={examIdx === 0} onClick={() => onExamNav && onExamNav('prev')} overrides={{ BaseButton: { style: { flex: 1 } } }}>Zurück</Button>
          {!isLast ? (
            <Button shape={SHAPE.pill} onClick={() => onExamNav && onExamNav('next')} overrides={{ BaseButton: { style: { flex: 2 } } }}>Weiter →</Button>
          ) : (
            <Button shape={SHAPE.pill} isLoading={!!examFinishing} disabled={!!examFinishing} onClick={() => onExamNav && onExamNav('finish')} overrides={{ BaseButton: { style: { flex: 2, backgroundColor: '#0f0f12' } } }}>Prüfung abgeben</Button>
          )}
        </Block>
        <Block marginTop="8px" display="flex" justifyContent="center">
          <Button kind={KIND.tertiary} size={SIZE.mini} shape={SHAPE.pill} onClick={onExitExam}>Abbrechen (Fortschritt geht verloren)</Button>
        </Block>
      </>
    );
  }

  // ---------------------------------------------------------- start screen
  const fullBest = readExamBest('full');
  return (
    <>
      <UberCard styleOverride={{ background: 'linear-gradient(135deg,#0f0f12 0%,#2a2a3a 60%,#4f46e5 100%)', color: '#fff', borderWidth: 0, paddingTop: '20px', paddingBottom: '20px' }}>
        <Block display="flex" justifyContent="space-between" alignItems="flex-start">
          <Block>
            <div style={{ fontSize: 11, letterSpacing: 1, opacity: 0.8, fontWeight: 700 }}>MENSCHEN A1 • MOCK EXAM</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>A1 Mock Exam</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>55 Fragen • 4 Teile • {bestLine(fullBest)}</div>
          </Block>
          <span style={{ display: 'inline-flex', padding: 10, borderRadius: 999, background: 'rgba(255,255,255,0.14)', flexShrink: 0 }}>
            <GraduationCap size={ICON_SIZES.card} aria-hidden="true" style={{ color: '#fff' }} />
          </span>
        </Block>
        <Block marginTop="14px">
          <Button shape={SHAPE.pill} onClick={() => onStartExam && onStartExam('full')} overrides={{ BaseButton: { style: { backgroundColor: '#fff', color: '#0f0f12', fontWeight: 800, width: '100%' } } }}>Prüfung starten →</Button>
        </Block>
      </UberCard>

      <UberCard styleOverride={{ marginTop: '12px', paddingTop: '12px', paddingBottom: '4px' }}>
        <LabelSmall color="#6b6b6b">Komplette Prüfung • Antwort pro Frage genau 1 von 4</LabelSmall>
        <Block marginTop="4px">
          {EXAM_SECTIONS.map((key) => (
            <SectionRow key={key} sectionKey={key} count={EXAM_MODE_COUNTS.full[key]} />
          ))}
        </Block>
      </UberCard>

      <Heading $style={{ fontSize: 16, margin: '16px 0 8px' }}>Einzelteile üben</Heading>
      <ParagraphSmall color="#6b6b6b" margin="0 0 8px">Nur ein Teil pro Lauf — ideal zum gezielten Üben. Jedes Mal neu gemischt.</ParagraphSmall>
      <Block display="flex" flexDirection="column" gridGap="8px">
        {SECTION_MODES.map((key) => {
          const Icon = SECTION_ICONS[key] || BookOpen;
          const best = readExamBest(key);
          return (
            <UberCard key={key} styleOverride={{ paddingTop: '12px', paddingBottom: '12px' }}>
              <Block display="flex" justifyContent="space-between" alignItems="center" gridGap="8px">
                <Block display="flex" alignItems="center" gridGap="8px">
                  <span style={{ display: 'inline-flex', padding: 8, borderRadius: 999, background: '#f7f7fb', border: '1px solid #e9e8f0' }}>
                    <Icon size={16} aria-hidden="true" style={{ color: '#0f0f12' }} />
                  </span>
                  <Block>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{EXAM_SECTION_LABELS[key]} • {examModeTotal(key)} Fragen</div>
                    <div style={{ fontSize: 11, color: '#9aa0b2', fontWeight: 600 }}>{bestLine(best)}</div>
                  </Block>
                </Block>
                <Button size={SIZE.compact} shape={SHAPE.pill} onClick={() => onStartExam && onStartExam(key)}>Start</Button>
              </Block>
            </UberCard>
          );
        })}
      </Block>

      <UberCard styleOverride={{ marginTop: '12px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: '#f7f7fb', borderColor: '#e9e8f0' }}>
        <ParagraphSmall margin={0}><span style={{ display: 'inline-flex', verticalAlign: -3, marginRight: 6 }}><Sparkles size={14} aria-hidden="true" style={{ color: '#6b6b7a' }} /></span>Jeder Lauf mischt <b>{BANK_META.grammatik} Grammatik-</b>, <b>{BANK_META.wortschatz} Wortschatz-</b> und <b>{BANK_META.lesen} Lese-Fragen</b> (plus Diktation aus allen Wörtern) neu — keine zwei Prüfungen sind gleich.</ParagraphSmall>
      </UberCard>

      <UberCard styleOverride={{ marginTop: '12px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: '#f7f7fb', borderColor: '#e9e8f0' }}>
        <ParagraphSmall margin={0}><span style={{ display: 'inline-flex', verticalAlign: -3, marginRight: 6 }}><Info size={14} aria-hidden="true" style={{ color: '#6b6b7a' }} /></span><b>Hören ist nicht dabei</b> — die App hat noch keine Audio-Prüfung. Abschluss-Bonus: bis zu 40 XP, einmalig — Wiederholungen zählen nur bei Verbesserung.</ParagraphSmall>
      </UberCard>
    </>
  );
}
