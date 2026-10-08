import { useMemo } from 'react';
import { BookOpen, CheckCircle2, Target, Medal, LoaderCircle } from 'lucide-react';
import { calcBookAnalytics } from '../../utils/analytics.js';
import { isWordMastered } from '../../utils/progress.js';
import { StatTile, AccuracyBar, LektionPerfRow, StrengthCallout, RecommendationBox, SectionLabel, AnalyticsEmpty, AnalyticsError, fmtPct } from './shared.jsx';

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
      <div className="bka bka-card bka-loading">
        <span className="bka-spin"><LoaderCircle size={28} strokeWidth={1.8} aria-hidden="true" /></span>
        <p>Loading your learning report…</p>
      </div>
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
          <div className="bka-actions">
            {actions.onStudy && <button type="button" className="btn dark" onClick={actions.onStudy}>Study this book →</button>}
            {actions.onQuizBook && <button type="button" className="btn light" onClick={actions.onQuizBook}>Quiz this book</button>}
          </div>
        )}
      </>
    );
  }

  const { onStudy, onQuizBook, onQuizLektion, onPracticeWeak } = actions;
  const maxDayQuestions = Math.max(1, ...analytics.progressOverTime.map((d) => d.questions));

  return (
    <div className="bka">
      {/* Overview: how well do I know this entire book? */}
      <section className="bka-card">
        <div className="bka-overview">
          <div>
            <SectionLabel>BOOK REPORT — {book.label}</SectionLabel>
            <div className="bka-accuracy">
              {fmtPct(analytics.accuracy)}
              <span> quiz accuracy</span>
            </div>
            <div className="bka-sub">
              {analytics.totalCorrect}/{analytics.totalQuestions} correct
              {analytics.hasHistory ? '' : ' • no quiz history yet'} • +{analytics.xp} XP from quizzes
            </div>
          </div>
          <div className="bka-mastered">
            <b>{analytics.masteredPct}%</b>
            <span>mastered</span>
          </div>
        </div>
        <div className="bka-bar">
          <AccuracyBar value={analytics.accuracy} height={8} delay={120} />
        </div>
        <div className="bka-tiles">
          <StatTile icon={Target} value={analytics.totalQuestions} label="Answered" sub="quiz questions" delay={100} />
          <StatTile icon={BookOpen} value={analytics.wordsPracticed} label="Practiced" sub={`of ${analytics.totalWords} words`} delay={140} />
          <StatTile icon={Medal} value={analytics.mastered} label="Mastered" sub={`${analytics.masteredPct}% of book`} color="#16a34a" delay={180} />
          <StatTile icon={CheckCircle2} value={`${analytics.seen}/${analytics.totalWords}`} label="Seen" sub={`${analytics.seenPct}% coverage`} delay={220} />
        </div>
        {!analytics.hasHistory && (
          <p className="bka-note">Mastery above comes from your flashcard progress. Complete a quiz to add accuracy data.</p>
        )}
      </section>

      {/* Progress over time */}
      {analytics.progressOverTime.length > 0 && (
        <section className="bka-card">
          <SectionLabel>PROGRESS OVER TIME</SectionLabel>
          <div className="bka-chart">
            {analytics.progressOverTime.map((d, i) => (
              <div key={d.date} className="bka-day" title={`${d.date}: ${d.correct}/${d.questions} (${fmtPct(d.accuracy)})`}>
                <b style={{ color: (d.accuracy ?? 0) >= 80 ? '#16a34a' : '#0f0f12' }}>{fmtPct(d.accuracy)}</b>
                <div className="bka-col">
                  <span
                    className="bka-fill"
                    style={{
                      height: `${Math.max(6, Math.round((d.questions / maxDayQuestions) * 100))}%`,
                      background: (d.accuracy ?? 0) >= 80 ? '#16a34a' : (d.accuracy ?? 0) >= 50 ? '#0f0f12' : '#ea580c',
                      animationDelay: `${Math.min(i, 13) * 50 + 100}ms`,
                    }}
                  />
                </div>
                <small>{d.date.slice(5)}</small>
              </div>
            ))}
          </div>
          <p className="bka-note">Bar height = questions that day • number = accuracy</p>
        </section>
      )}

      {/* Per-Lektion */}
      <section className="bka-card">
        <SectionLabel>PERFORMANCE BY LEKTION</SectionLabel>
        <div className="bka-lek">
          {analytics.perLektion.map((e, i) => (
            <LektionPerfRow key={e.key} entry={e} index={i} book={book.id} showWords onPractice={onQuizLektion} />
          ))}
        </div>
      </section>

      {/* Strengths + recommendation */}
      {(analytics.strongest || analytics.weakest) && (
        <section className="bka-card">
          <SectionLabel>STRENGTHS & FOCUS</SectionLabel>
          <div className="bka-strength">
            <StrengthCallout strongest={analytics.strongest} weakest={analytics.weakest} delay={60} />
          </div>
        </section>
      )}

      <section className="bka-card">
        <RecommendationBox recommendation={analytics.recommendation} delay={100} />
        {(onStudy || onQuizBook || onPracticeWeak) && (
          <div className="bka-actions">
            {analytics.recommendation?.focusLektion && onQuizLektion && (
              <button type="button" className="btn dark" onClick={() => onQuizLektion(analytics.recommendation.focusLektion)}>
                Practice {analytics.recommendation.focusLektion} →
              </button>
            )}
            {onPracticeWeak && <button type="button" className="btn light" onClick={onPracticeWeak}>Review weak words</button>}
            {onStudy && <button type="button" className="btn light" onClick={onStudy}>Study book</button>}
            {onQuizBook && <button type="button" className="btn light" onClick={onQuizBook}>Quiz book</button>}
          </div>
        )}
      </section>
    </div>
  );
}