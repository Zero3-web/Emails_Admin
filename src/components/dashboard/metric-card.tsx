import Link from "next/link";
import { FileClock, MailCheck, Send, UsersRound } from "lucide-react";

type MetricKind = "audience" | "drafts" | "sent" | "delivery";

type MetricCardProps = {
  label: string;
  value: number;
  note: string;
  kind: MetricKind;
  suffix?: string;
  href?: string;
  attention?: boolean;
};

const icons = {
  audience: UsersRound,
  drafts: FileClock,
  sent: Send,
  delivery: MailCheck,
};

export function MetricCard({ label, value, note, kind, suffix = "", href, attention = false }: MetricCardProps) {
  const Icon = icons[kind];
  const content = (
    <>
      <span className={`dashboard-metric-icon ${attention ? "attention" : ""}`}><Icon size={17} /></span>
      <div><span>{label}</span><strong>{value.toLocaleString("es-PE")}{suffix}</strong><small>{note}</small></div>
    </>
  );
  return href ? <Link href={href} className={`up-card up-metric dashboard-metric ${attention ? "attention" : ""}`}>{content}</Link> : <article className={`up-card up-metric dashboard-metric ${attention ? "attention" : ""}`}>{content}</article>;
}
