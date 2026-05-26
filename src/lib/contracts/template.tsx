import "server-only";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ContractData } from "./types";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 11, color: "#0b1220" },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 24 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#0b1220" },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 140, color: "#666" },
  value: { flex: 1 },
  p: { marginBottom: 6, lineHeight: 1.4 },
  small: { fontSize: 9, color: "#666" },
  signatureBlock: { marginTop: 36, paddingTop: 16, borderTop: 1, borderColor: "#ccc" },
  signatureImage: { width: 180, height: 60, marginBottom: 8 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: "#999" },
});

const ROLE_LABEL: Record<ContractData["staff"]["job_role"], string> = {
  KITCHEN: "Kitchen",
  SERVICE: "Service (Front of House)",
};

const CONTRACT_LABEL: Record<ContractData["staff"]["contract_type"], string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CASUAL: "Casual",
};

function policyText(p: ContractData["ot_policy"]): string {
  const base =
    p.basis === "weekly"
      ? `Overtime applies to hours worked over ${p.weekly_threshold_h} hours per week`
      : p.basis === "daily"
        ? `Overtime applies to hours worked over ${p.daily_threshold_h} hours per day`
        : `Overtime applies to hours worked over ${p.weekly_threshold_h}/week or ${p.daily_threshold_h}/day (whichever yields more)`;
  return `${base}, paid at ${p.multiplier}× the regular rate. Public-holiday and weekly-rest-day hours are paid at ${p.holiday_multiplier}× the regular rate.`;
}

export function ContractDocument({
  data,
  signatureDataUrl,
}: {
  data: ContractData;
  signatureDataUrl: string | null;
}) {
  return (
    <Document title={`Employment Agreement — ${data.staff.full_name}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Employment Agreement</Text>
        <Text style={styles.subtitle}>{data.tenant.name} — Bonaire (Caribbean Netherlands)</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parties</Text>
          <View style={styles.row}><Text style={styles.label}>Employer</Text><Text style={styles.value}>{data.tenant.name}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Employee</Text><Text style={styles.value}>{data.staff.full_name}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Email</Text><Text style={styles.value}>{data.staff.email}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Date of birth</Text><Text style={styles.value}>{data.staff.date_of_birth}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Position</Text>
          <View style={styles.row}><Text style={styles.label}>Role</Text><Text style={styles.value}>{ROLE_LABEL[data.staff.job_role]}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Contract type</Text><Text style={styles.value}>{CONTRACT_LABEL[data.staff.contract_type]}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Primary location</Text><Text style={styles.value}>{data.location.name}{data.location.address ? ` — ${data.location.address}` : ""}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compensation</Text>
          <View style={styles.row}><Text style={styles.label}>Regular hourly rate</Text><Text style={styles.value}>USD {data.rate_regular_usd.toFixed(2)}/hour</Text></View>
          <Text style={[styles.p, { marginTop: 6 }]}>{policyText(data.ot_policy)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Term</Text>
          <View style={styles.row}><Text style={styles.label}>Effective from</Text><Text style={styles.value}>{data.effective_from}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Effective to</Text><Text style={styles.value}>{data.effective_to ?? "Open-ended"}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General terms</Text>
          <Text style={styles.p}>
            This agreement is governed by the Wet Arbeid BES and other applicable laws of the
            Caribbean Netherlands. Hours worked are recorded via the ClockIn time-clock and
            reviewed by the Employer for payroll purposes.
          </Text>
          <Text style={styles.p}>
            The Employee agrees to follow the Employer&apos;s operational policies, including
            clock-in/out procedures and the manager-approved override process when clocking in
            from outside the location perimeter.
          </Text>
          <Text style={styles.p}>
            Either party may terminate this agreement by giving notice in accordance with the
            Wet Arbeid BES. Payment for hours worked through the termination date will be made
            on the next regular payroll date.
          </Text>
        </View>

        <View style={styles.signatureBlock}>
          <Text style={styles.sectionTitle}>Employee signature</Text>
          {signatureDataUrl ? (
            <Image src={signatureDataUrl} style={styles.signatureImage} />
          ) : (
            <Text style={[styles.small, { fontStyle: "italic" }]}>Not yet signed.</Text>
          )}
          <Text style={styles.small}>
            {data.staff.full_name}
            {data.signed_at ? ` — signed ${new Date(data.signed_at).toLocaleString()}` : ""}
          </Text>
        </View>

        <Text style={styles.footer} fixed>Generated by ClockIn — Contract ID {data.id}</Text>
      </Page>
    </Document>
  );
}
