import { useMemo } from 'react';
import { Block } from 'baseui/block';
import { Button, KIND, SHAPE } from 'baseui/button';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import UberCard from '../cards/UberCard.jsx';
import { calcBookAnalytics } from '../../utils/analytics.js';
import { isWordMastered } from '../../utils/progress.js';
import { StatTile, AccuracyBar, LektionPerfRow, StrengthCallout, RecommendationBox, SectionLabel, AnalyticsEmpty, AnalyticsError, fmtPct } from './shared.jsx';
import {
  BookOpen,
  CheckCircle2,
  Target,
  Medal,
  LoaderCircle,
} from '../icons.jsx';

/**
 * Full-book learning analytics (Issue #2 §2).
 * Natural expansion of the existing book view: SRS progress (seen/mastered)
 * + quiz history (accuracy, XP, progress over time). Math shared with quiz
 * reports via utils/analytics.js.
 */
export default function BookAnalytics({ book, allWords, progressMap, attempts, loading, error, onRetry, actions = {} }) {
  const analytics = useMemo(() => {
    if (!book || !allWords) return null;
    return calcBookAnalytics({ bookId: book.id, allWords, progressMap: progressMap || {}, attempts: attempts || [], isMastered: isWordMastered });
  }, [book, allWords, progressMap, attempts]);

  if (loading) {
    return (
      <UberCard styleOverride={{ textAlign: 'center', paddingTop: 24, paddingBottom: 24 }}>
        <div className="gs-report-item" style={{ display: 'flex', justifyContent: 'center' }}>
          <LoaderCircle size={28} aria-hidden="true" className="gs-spin" style={{ color: '#4f46e5' }} />
        </div>
        <ParagraphSmall color="#6b6b6b" margin="8px 0 0">Loading your learning report…</ParagraphSmall>
      </UberCard>
    );
  }

  if (error) {
    return <AnalyticsError message={error} onRetry={onRetry} />;
  }

  if (!analytics) return null;

  if (!analytics.hasHistory && !analytics.hasProgress) {
    return (
      <>
        <AnalyticsEmpty
          icon={BookOpen}
          title={`How well do you know ${book.label}?`}
          hint="Study flashcards or complete a quiz in this book — your accuracy, mastery and per-Lektion breakdown will appear here."
        />
        {(actions.onStudy || actions.onQuizBook) && (
          <Block display="flex" gridGap="8px" marginTop="8px" overrides={{ Block: { style: { flexWrap: 'wrap' } } }}>
            {actions.onStudy && <Button shape={SHAPE.pill} onClick={actions.onStudy}>Study this book →</Button>}
            {actions.onQuizBook && <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={actions.onQuizBook}>Quiz this book</Button>}
          </Block>
        )}
      </>
    );
  }

  const { onStudy, onQuizBook, onQuizLektion, onPracticeWeak } = actions;
  const maxDayQuestions = Math.max(1, ...analytics.progressOverTime.map((d) => d.questions));

  return (
    <Block display="flex" flexDirection="column" gridGap="12px">
      {/* Overview: how well do I know this entire book? */}
      <UberCard>
        <Block display="flex" justifyContent="space-between" alignItems="flex-start">
          <Block>
            <SectionLabel>BOOK REPORT — {book.label}</SectionLabel>
            <div className="gs-report-item" style={{ fontWeight: 800, fontSize: 26, marginTop: 6 }}>
              {fmtPct(analytics.accuracy)}
              <span style={{ fontSize: 12, fontWeight: 400, color: '#6b6b7a' }}> quiz accuracy</span>
            </div>
            <div style={{ fontSize: 12, color: '#6b6b7a', marginTop: 2 }}>
              {analytics.totalCorrect}/{analytics.totalQuestions} correct
              {analytics.hasHistory ? '' : ' • no quiz history yet'} • +{analytics.xp} XP from quizzes
            </div>
          </Block>
          <Block display="flex" flexDirection="column" alignItems="flex-end" overrides={{ Block: { style: { flexShrink: 0 } } }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{analytics.masteredPct}%</div>
            <LabelSmall color="#6b6b6b">mastered</LabelSmall>
          </Block>
        </Block>
        <Block marginTop="10px">
          <AccuracyBar value={analytics.accuracy} height={8} delay={120} />
        </Block>
        <div className="gs-report-item gs-stats-grid" style={{ marginTop: 12, animationDelay: '100ms' }}>
          <StatTile icon={Target} value={analytics.totalQuestions} label="Answered" sub="quiz questions" delay={100} />
          <StatTile icon={BookOpen} value={analytics.wordsPracticed} label="Practiced" sub={`of ${analytics.totalWords} words`} delay={140} />
          <StatTile icon={Medal} value={analytics.mastered} label="Mastered" sub={`${analytics.masteredPct}% of book`} color="#16a34a" delay={180} />
          <StatTile icon={CheckCircle2} value={`${analytics.seen}/${analytics.totalWords}`} label="Seen" sub={`${analytics.seenPct}% coverage`} delay={220} />
        </div>
        {!analytics.hasHistory && (
          <ParagraphSmall color="#9aa0b2" margin="8px 0 0">
            Mastery above comes from your flashcard progress. Complete a quiz to add accuracy data.
          </ParagraphSmall>
        )}
      </UberCard>

      {/* Progress over time */}
      {analytics.progressOverTime.length > 0 && (
        <UberCard>
          <SectionLabel>PROGRESS OVER TIME</SectionLabel>
          <Block display="flex" alignItems="flex-end" gridGap="6px" marginTop="12px" overrides={{ Block: { style: { minHeight: 84 } } }}>
            {analytics.progressOverTime.map((d, i) => (
              <div key={d.date} className="gs-report-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animationDelay: `${Math.min(i, 13) * 50}ms` }} title={`${d.date}: ${d.correct}/${d.questions} (${fmtPct(d.accuracy)})`}>
                <div style={{ fontSize: 10, fontWeight: 800, color: (d.accuracy ?? 0) >= 80 ? '#16a34a' : '#0f0f12' }}>{fmtPct(d.accuracy)}</div>
                <div style={{ width: '100%', maxWidth: 34, height: 56, background: '#f1f1f4', borderRadius: 8, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                  <div
                    className="gs-bar-fill"
                    style={{
                      width: '100%',
                      height: `${Math.max(6, Math.round((d.questions / maxDayQuestions) * 100))}%`,
                      background: (d.accuracy ?? 0) >= 80 ? '#16a34a' : (d.accuracy ?? 0) >= 50 ? '#0f0f12' : '#ea580c',
                      borderRadius: 8,
                      animationDelay: `${Math.min(i, 13) * 50 + 100}ms`,
                    }}
                  />
                </div>
                <div style={{ fontSize: 9, color: '#9aa0b2' }}>{d.date.slice(5)}</div>
              </div>
            ))}
          </Block>
          <ParagraphSmall color="#9aa0b2" margin="6px 0 0">Bar height = questions that day • number = accuracy</ParagraphSmall>
        </UberCard>
      )}

      {/* Per-Lektion */}
      <UberCard>
        <SectionLabel>PERFORMANCE BY LEKTION</SectionLabel>
        <Block display="flex" flexDirection="column" gridGap="8px" marginTop="10px">
          {analytics.perLektion.map((e, i) => (
            <LektionPerfRow key={e.key} entry={e} index={i} showWords onPractice={onQuizLektion} />
          ))}
        </Block>
      </UberCard>

      {/* Strengths + recommendation */}
      {(analytics.strongest || analytics.weakest) && (
        <UberCard>
          <SectionLabel>STRENGTHS & FOCUS</SectionLabel>
          <Block marginTop="10px">
            <StrengthCallout strongest={analytics.strongest} weakest={analytics.weakest} delay={60} />
          </Block>
        </UberCard>
      )}
      <UberCard>
        <RecommendationBox recommendation={analytics.recommendation} delay={100} />
        {(onStudy || onQuizBook || onPracticeWeak) && (
          <Block display="flex" gridGap="8px" marginTop="12px" overrides={{ Block: { style: { flexWrap: 'wrap' } } }}>
            {analytics.recommendation?.focusLektion && onQuizLektion && (
              <Button shape={SHAPE.pill} onClick={() => onQuizLektion(analytics.recommendation.focusLektion)}>
                Practice {analytics.recommendation.focusLektion} →
              </Button>
            )}
            {onPracticeWeak && <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onPracticeWeak}>Review weak words</Button>}
            {onStudy && <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onStudy}>Study book</Button>}
            {onQuizBook && <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onQuizBook}>Quiz book</Button>}
          </Block>
        )}
      </UberCard>
    </Block>
  );
}
