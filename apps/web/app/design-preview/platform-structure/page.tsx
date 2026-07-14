import { Card, Badge } from "@allchemist/ui";
import { MainLayout, ShellIcon } from "../../../components/platform-layout";
import styles from "./platformStructure.module.css";

const tabs = [
  { id: "structure", label: "Структура", href: "/design-preview/platform-structure" },
  { id: "navigation", label: "Навигация", href: "#navigation" },
  { id: "content", label: "Контентные зоны", href: "#content" },
];

export default function PlatformStructurePage() {
  return (
    <MainLayout
      activeHref="/dashboard/student"
      eyebrow="Фиксация структуры"
      title="Фиксация структуры веб-версии платформы «Алхимик»"
      description="Ниже описаны неизменяемые элементы интерфейса и правила, которые определяют стабильную структуру веб-версии платформы."
      breadcrumbs={[
        { label: "Главная", href: "/dashboard/student" },
        { label: "Дизайн-система", href: "/design-preview/platform-structure" },
        { label: "Web layout lock" },
      ]}
      tabs={tabs}
      activeTabId="structure"
      rightAside={<RulesPanel />}
      bottomBlocks={<FixedNotice />}
    >
      <section className={styles.structureGrid} id="content">
        <Card className={styles.zoneCard}>
          <span className={styles.zoneNumber}>1</span>
          <h2>Боковая панель</h2>
          <p>Фиксирована слева. Содержит логотип, навигацию и нижний системный блок. Не меняется при переходах между разделами.</p>
          <div className={styles.sidebarMock}>
            <span />
            <i />
            <i />
            <i />
            <i />
          </div>
        </Card>
        <Card className={styles.zoneCard}>
          <span className={styles.zoneNumber}>2</span>
          <h2>Верхняя панель</h2>
          <p>Фиксирована сверху. Содержит layout control, поиск, AI, уведомления и блок пользователя в неизменяемых слотах.</p>
          <div className={styles.topbarMock}>
            <span />
            <i />
            <b />
            <b />
          </div>
        </Card>
        <Card className={styles.zoneCard}>
          <span className={styles.zoneNumber}>3</span>
          <h2>Область контента</h2>
          <p>Единственная зона, где меняется содержимое: breadcrumbs, заголовок, вкладки, основной контент и optional aside.</p>
          <div className={styles.contentMock} />
        </Card>
      </section>

      <Card className={styles.composition} id="navigation">
        <h2>Пример компоновки</h2>
        <div className={styles.compositionMock}>
          <div className={styles.compositionSidebar}>
            <img src="/design-assets/shared/logo/allchemist-mark.svg" alt="" />
            {Array.from({ length: 8 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className={styles.compositionMain}>
            <div className={styles.compositionTopbar}>
              <span />
              <i />
              <b />
              <b />
            </div>
            <div className={styles.compositionContent}>
              <article>
                <ShellIcon name="cube" />
                <span />
                <span />
                <span />
              </article>
              <aside>
                <ShellIcon name="flask" />
                <span />
                <span />
              </aside>
              <footer>
                <ShellIcon name="ai" />
                <span />
              </footer>
            </div>
          </div>
        </div>
      </Card>
    </MainLayout>
  );
}

function RulesPanel() {
  const rules = [
    "Боковая панель всегда фиксирована слева и занимает постоянную ширину.",
    "Логотип «Алхимик» всегда расположен в левом верхнем углу sidebar.",
    "Topbar всегда фиксирован сверху над областью контента.",
    "Колокольчик всегда стоит перед блоком пользователя.",
    "Имя, отчество и роль пользователя всегда находятся в правом верхнем углу.",
    "Порядок пунктов меню не меняется.",
    "Подпункты меню раскрываются вниз внутри sidebar.",
    "Активный пункт выделяется синим/циановым состоянием.",
    "Меняется только содержимое основной content area.",
  ];

  return (
    <>
      <Card className={styles.rulesCard}>
        <h2>Правила структуры</h2>
        <ol>
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </Card>
      <Card className={styles.constantsCard}>
        <h2>Визуальные константы</h2>
        <p><Badge tone="info">фон</Badge> Светлая рабочая область с научным паттерном.</p>
        <p><Badge tone="info">sidebar</Badge> Deep blue / science blue.</p>
        <p><Badge tone="info">accent</Badge> Blue / cyan / violet.</p>
        <p><Badge tone="info">cards</Badge> Rounded cards, borders, soft shadows.</p>
      </Card>
    </>
  );
}

function FixedNotice() {
  return (
    <div className={styles.notice}>
      <ShellIcon name="shield" />
      <span>Данная структура является базовой для веб-страниц платформы. Меняться может только содержимое области контента.</span>
    </div>
  );
}
