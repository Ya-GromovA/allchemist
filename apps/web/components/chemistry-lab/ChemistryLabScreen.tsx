"use client";

import { useReducer } from "react";
import { Badge, Button, Card, ProgressBar, StatusPill } from "@allchemist/ui";
import { createInitialLabState, labReducer, type LabActionType, type LabScenario } from "../../../../packages/chemistry-lab-engine/src";
import { adaptChemistryLabScenario } from "../../lib/adapters/chemistry-lab";
import { StudentShell } from "../student-shell/StudentShell";
import styles from "./ChemistryLabScreen.module.css";

export interface ChemistryLabScreenProps {
  scenario: LabScenario;
}

export function ChemistryLabScreen({ scenario }: ChemistryLabScreenProps) {
  const [state, dispatch] = useReducer((current: ReturnType<typeof createInitialLabState>, action: Parameters<typeof labReducer>[2]) => labReducer(scenario, current, action), scenario, createInitialLabState);
  const view = adaptChemistryLabScenario(scenario, state);
  const activeObservations = scenario.observations.filter((observation) => state.observations.includes(observation.id));

  const send = (type: LabActionType, reagentId?: string) => dispatch({ type, reagentId });

  return (
    <StudentShell activeHref="/modules/chemistry/lab/zinc-hcl">
      <main className={styles.labWorkspace}>
        <nav className={styles.breadcrumb} aria-label="Хлебные крошки">
          <a href="/modules">Модули</a>
          <span>/</span>
          <a href="/modules/chemistry">Химия</a>
          <span>/</span>
          <strong>Лаборатория</strong>
        </nav>

        <section className={styles.hero}>
          <div>
            <Badge tone="warning">Draft / needs safety review</Badge>
            <h1>{view.title}</h1>
            <p>{view.subtitle}</p>
          </div>
          <div className={styles.heroStatus}>
            <StatusPill status={view.phaseLabel} tone={state.phase === "completed" ? "success" : state.phase === "error" ? "warning" : "info"} />
            <span>{scenario.publicationAllowed ? "Можно публиковать" : "Публикация запрещена"}</span>
          </div>
        </section>

        <section className={styles.labGrid} aria-label="Chemistry Lab — Zn + HCl">
          <Card className={styles.sidePanel}>
            <header>
              <h2>Реактивы</h2>
              <span>{scenario.equationRu}</span>
            </header>
            <div className={styles.reagentList}>
              {scenario.reagents.map((reagent) => (
                <article key={reagent.id} data-role={reagent.role} data-added={state.addedReagentIds.includes(reagent.id) ? "true" : "false"}>
                  <strong>{reagent.formula}</strong>
                  <span>{reagent.labelRu}</span>
                  {reagent.hazardNoteRu ? <small>{reagent.hazardNoteRu}</small> : null}
                </article>
              ))}
            </div>
            <div className={styles.safetyBox}>
              <h3>Safety</h3>
              <ul>
                {scenario.safety.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className={styles.labSceneCard}>
            <div className={styles.sceneHeader}>
              <div>
                <span>Virtual wet lab</span>
                <h2>Zn + HCl reaction chamber</h2>
              </div>
              <strong>{view.phaseLabel}</strong>
            </div>
            <div className={styles.labScene} data-phase={state.phase} aria-label="Интерактивная лабораторная сцена">
              <div className={styles.backLight} />
              <div className={styles.testTubeRack}>
                <span data-filled={state.addedReagentIds.includes("hcl") ? "true" : "false"}>HCl</span>
                <span data-filled={state.addedReagentIds.includes("zn") ? "true" : "false"}>Zn</span>
              </div>
              <div className={styles.flask} data-zinc={state.addedReagentIds.includes("zn") ? "true" : "false"}>
                <div className={styles.liquid} />
                <div className={styles.zincChip} />
                <div className={styles.bubbles} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className={styles.phStrip} data-active={state.observations.includes("acidic_environment") ? "true" : "false"}>
                pH
              </div>
              <div className={styles.sceneReadout}>
                <span>pH: {state.observations.includes("acidic_environment") ? "2-3" : "--"}</span>
                <span>Temp: {state.observations.includes("temperature_rise") ? "+2 C" : "stable"}</span>
                <span>Gas: {state.observations.includes("gas_bubbles") ? "H2" : "--"}</span>
              </div>
            </div>

            <div className={styles.controlPanel} aria-label="Управление лабораторией">
              <Button type="button" onClick={() => send("START_LAB")} disabled={!view.canStart}>
                Начать лабораторию
              </Button>
              <Button type="button" onClick={() => send("ADD_REAGENT", "zn")} disabled={!view.canAddZinc} variant="secondary">
                Добавить Zn
              </Button>
              <Button type="button" onClick={() => send("ADD_REAGENT", "hcl")} disabled={!view.canAddAcid} variant="secondary">
                Добавить HCl
              </Button>
              <Button type="button" onClick={() => send("OBSERVE")} disabled={!view.canObserve} variant="secondary">
                Наблюдать
              </Button>
              <Button type="button" onClick={() => send("CHECK_PH")} disabled={!view.canCheckPh} variant="secondary">
                Проверить pH
              </Button>
              <Button type="button" onClick={() => send("COMPLETE_STEP")} disabled={!view.canComplete} variant="secondary">
                Сделать вывод
              </Button>
              <Button type="button" onClick={() => send("RESET_LAB")} variant="ghost">
                Сбросить
              </Button>
            </div>
          </Card>

          <Card className={styles.sidePanel}>
            <header>
              <h2>Шаги</h2>
              <span>{view.progressPercent}%</span>
            </header>
            <ProgressBar value={view.progressPercent} />
            <ol className={styles.stepList}>
              {scenario.steps.map((step) => (
                <li key={step.id} data-complete={state.completedStepIds.includes(step.id) ? "true" : "false"} data-active={state.currentStepId === step.id ? "true" : "false"}>
                  <strong>{step.titleRu}</strong>
                  <span>{step.descriptionRu}</span>
                </li>
              ))}
            </ol>
            <div className={`${styles.aiPanel} ${styles[`ai-${view.aiTone}`]}`} aria-label="AI-наставник">
              <strong>{view.aiTitle}</strong>
              <p>{view.aiBody}</p>
            </div>
          </Card>
        </section>

        <section className={styles.bottomGrid}>
          <Card className={styles.observationCard}>
            <h2>Наблюдения</h2>
            {activeObservations.length ? (
              <div className={styles.observationList}>
                {activeObservations.map((observation) => (
                  <article key={observation.id}>
                    <strong>{observation.labelRu}</strong>
                    <span>{observation.explanationRu}</span>
                    <small>{observation.verified ? "verified" : "draft / needs review"}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p>Наблюдения появятся после запуска реакции.</p>
            )}
          </Card>

          <Card className={styles.explanationCard}>
            <h2>Молекулярное объяснение</h2>
            <div className={styles.equation}>{scenario.equationRu}</div>
            <p>{scenario.explanation.gasRu}</p>
            <p>{scenario.explanation.whyBubblesRu}</p>
            <p>{scenario.explanation.molecularRu}</p>
          </Card>

          <Card className={styles.reviewCard}>
            <h2>Content QA</h2>
            <dl>
              <div>
                <dt>Safety status</dt>
                <dd>{scenario.safetyStatus}</dd>
              </div>
              <div>
                <dt>Publication</dt>
                <dd>{scenario.publicationAllowed ? "allowed" : "blocked"}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{scenario.sourceIds.join(", ")}</dd>
              </div>
            </dl>
          </Card>
        </section>
      </main>
    </StudentShell>
  );
}
