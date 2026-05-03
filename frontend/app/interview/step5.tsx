/**
 * Krok 5 — Sytuacja rodzinna
 */
import React, { useState } from "react";
import {
  View, ScrollView, StyleSheet, Text, TouchableOpacity,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { useScrollGuard } from "@/hooks/useScrollGuard";
import ScrollEndBanner from "@/components/ui/ScrollEndBanner";
import { Button, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInterviewStore, FamilyMember } from "@/store/interviewStore";
import {
  FAMILY_RELATIONS, EDUCATION_LEVELS, EMPLOYMENT_STATUS,
  MARITAL_STATUS, GENDER_OPTIONS, DISABILITY_DEGREES, ADDICTION_TYPES,
} from "@/constants/formOptions";
import { colors, spacing, fontSize } from "@/constants/theme";
import { cs } from "@/constants/commonStyles";
import FormField from "@/components/ui/FormField";
import StepHeader from "@/components/ui/StepHeader";
import YesNo from "@/components/ui/YesNo";
import ChipSelector from "@/components/ui/ChipSelector";
import { generateFakeMember } from "@/constants/fakeData";
import ScanSectionButton from "@/components/ui/ScanSectionButton";

type FormMode = "add" | "edit" | null;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLbl}>{text}</Text>;
}

export default function Step5() {
  const store = useInterviewStore();
  const fam = store.formData.family;
  const personal = store.formData.personal;

  const mainPersonName = [personal.first_name, personal.last_name].filter(Boolean).join(" ");
  const mainPersonBirthYear = personal.birth_date?.split(".")?.at(-1) ?? null;
  const mainPersonGender = personal.gender === "K" ? "Kobieta" : personal.gender === "M" ? "Mężczyzna" : null;

  const mainPersonMissingFields = [
    !personal.pesel            && "PESEL",
    !personal.birth_date       && "data urodzenia",
    !personal.gender           && "płeć",
    !personal.marital_status   && "stan cywilny",
    !personal.income_amount    && "dochód",
  ].filter(Boolean) as string[];

  const { scrollRef, isAtBottom, scrollProps, tryNext } = useScrollGuard();
  const [formMode, setFormMode]       = useState<FormMode>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [formMember, setFormMember]   = useState<Partial<FamilyMember>>({});
  const [formGender, setFormGender]   = useState<"F" | "M">("F");
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg]       = useState("");

  const set = (patch: Partial<FamilyMember>) => setFormMember((p) => ({ ...p, ...patch }));

  const openAddForm = () => {
    setFormMember({});
    setFormGender("F");
    setEditingId(null);
    setFormMode("add");
  };

  const openEditForm = (member: FamilyMember) => {
    setFormMember({ ...member });
    setFormGender(member.gender === "M" ? "M" : "F");
    setEditingId(member.id);
    setFormMode("edit");
  };

  const cancelForm = () => {
    setFormMode(null);
    setFormMember({});
    setEditingId(null);
  };

  const handleScanApply = (data: Record<string, any>) => {
    if (Array.isArray(data.members) && data.members.length > 0) {
      data.members.forEach((m: any, idx: number) => {
        store.addFamilyMember({
          id: `${Date.now()}_${idx}`,
          name: `Członek rodziny ${fam.members.length + idx + 1}`,
          birth_year:        m.birth_year ? Number(m.birth_year) : undefined,
          relation:          m.relation          ?? "",
          education:         m.education         ?? "",
          employment_status: m.employment_status ?? "",
          income_amount:     m.income_amount ? Number(m.income_amount) : undefined,
        });
      });
    }
    store.updateFamily({
      ...(data.has_conflicts         != null ? { has_conflicts:         data.has_conflicts         } : {}),
      ...(data.has_domestic_violence != null ? { has_domestic_violence: data.has_domestic_violence } : {}),
      ...(data.has_childcare_issues  != null ? { has_childcare_issues:  data.has_childcare_issues  } : {}),
      ...(data.conflicts_description  ? { conflict_description:  data.conflicts_description  } : {}),
      ...(data.violence_description   ? { violence_description:  data.violence_description   } : {}),
      ...(data.childcare_description  ? { childcare_description: data.childcare_description  } : {}),
    });
  };

  const handleSave = () => {
    if (!formMember.name?.trim()) {
      Alert.alert("Brak danych", "Podaj imię i nazwisko członka rodziny.");
      return;
    }
    const name = formMember.name.trim();
    const { id: _id, name: _name, ...rest } = formMember as FamilyMember;

    if (formMode === "add") {
      store.addFamilyMember({ id: Date.now().toString(), name, ...rest });
      setSnackMsg(`Dodano: ${name}`);
    } else if (formMode === "edit" && editingId) {
      store.updateFamilyMember(editingId, { name, ...rest });
      setSnackMsg(`Zapisano zmiany: ${name}`);
    }

    setFormMember({});
    setFormMode(null);
    setEditingId(null);
    setSnackVisible(true);
  };

  const isEditing = formMode === "edit";

  return (
    <SafeAreaView style={cs.safe}>
      <StepHeader step={5} />

      <ScrollView ref={scrollRef} {...scrollProps} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={cs.title}>Sytuacja rodzinna</Text>
        <ScanSectionButton step={5} onApply={handleScanApply} />

        {/* Lista członków rodziny */}
        <View style={cs.card}>
          <Text style={cs.cardTitle}>Skład rodziny</Text>

          {mainPersonName ? (
            <View style={styles.mainPersonRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.mainPersonNameRow}>
                  <Text style={styles.memberName}>{mainPersonName}</Text>
                  <View style={styles.headBadge}>
                    <Text style={styles.headBadgeText}>głowa rodziny</Text>
                  </View>
                </View>
                <Text style={styles.memberSub}>
                  {[mainPersonGender, mainPersonBirthYear ? `ur. ${mainPersonBirthYear}` : null, personal.marital_status || null, personal.income_amount ? `${parseFloat(personal.income_amount).toFixed(2)} zł` : null].filter(Boolean).join(" · ")}
                </Text>
                {mainPersonMissingFields.length > 0 && (
                  <View style={styles.missingFieldsRow}>
                    {mainPersonMissingFields.map((f) => (
                      <View key={f} style={styles.missingFieldChip}>
                        <Text style={styles.missingFieldText}>! {f}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => router.push("/interview/step1")} style={styles.editBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.editText}>✎</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => router.push("/interview/step1")} style={styles.missingPersonRow}>
              <Text style={styles.missingPersonText}>⚠ Uzupełnij dane osobowe w kroku 1</Text>
              <Text style={styles.missingPersonLink}>Przejdź →</Text>
            </TouchableOpacity>
          )}

          {fam.members.length === 0 && (
            <Text style={styles.emptyText}>Brak dodatkowych członków rodziny</Text>
          )}
          {fam.members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberSub}>
                  {[
                    m.relation,
                    m.birth_year ? `ur. ${m.birth_year}` : null,
                    m.gender === "K" ? "kobieta" : m.gender === "M" ? "mężczyzna" : null,
                    m.employment_status || null,
                    m.income_amount != null ? `${m.income_amount.toFixed(2)} zł` : null,
                  ].filter(Boolean).join(" · ")}
                </Text>
                {(m.has_disability_certificate || m.has_addiction || m.has_health_insurance === false) && (
                  <View style={styles.memberBadgeRow}>
                    {m.has_disability_certificate && <View style={styles.memberBadge}><Text style={styles.memberBadgeText}>niepełnospr.</Text></View>}
                    {m.has_addiction && <View style={[styles.memberBadge, styles.memberBadgeWarn]}><Text style={[styles.memberBadgeText, styles.memberBadgeTextWarn]}>uzależnienie</Text></View>}
                    {m.has_health_insurance === false && <View style={[styles.memberBadge, styles.memberBadgeErr]}><Text style={[styles.memberBadgeText, styles.memberBadgeTextErr]}>bez NFZ</Text></View>}
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => openEditForm(m)} style={styles.editBtn}>
                <Text style={styles.editText}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Alert.alert("Usuń członka rodziny", `Czy na pewno usunąć „${m.name}" z listy?`, [
                  { text: "Anuluj", style: "cancel" },
                  { text: "Usuń", style: "destructive", onPress: () => store.removeFamilyMember(m.id) },
                ])}
                style={styles.removeBtn}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <Button mode="outlined" icon="account-plus" onPress={openAddForm} style={styles.addMemberBtn}>
            Dodaj członka rodziny
          </Button>
        </View>

        {/* Sytuacja problemowa */}
        <View style={cs.card}>
          <Text style={cs.cardTitle}>Sytuacja problemowa</Text>

          <Text style={cs.fieldLabel}>Konflikty w rodzinie?</Text>
          <YesNo value={fam.has_conflicts} onChange={(v) => store.updateFamily({ has_conflicts: v })} />
          {fam.has_conflicts && (
            <FormField label="Opis konfliktów" value={fam.conflict_description} onChangeText={(v) => store.updateFamily({ conflict_description: v })} multiline numberOfLines={3} style={{ marginTop: spacing.sm }} />
          )}

          <Text style={[cs.fieldLabel, { marginTop: spacing.md }]}>Przemoc w rodzinie?</Text>
          <YesNo value={fam.has_domestic_violence} onChange={(v) => store.updateFamily({ has_domestic_violence: v })} />
          {fam.has_domestic_violence && (
            <FormField label="Opis przemocy" value={fam.violence_description} onChangeText={(v) => store.updateFamily({ violence_description: v })} multiline numberOfLines={3} style={{ marginTop: spacing.sm }} />
          )}

          <Text style={[cs.fieldLabel, { marginTop: spacing.md }]}>Problemy opiekuńczo-wychowawcze?</Text>
          <YesNo value={fam.has_childcare_issues} onChange={(v) => store.updateFamily({ has_childcare_issues: v })} />
          {fam.has_childcare_issues && (
            <FormField label="Opis problemów" value={fam.childcare_description} onChangeText={(v) => store.updateFamily({ childcare_description: v })} multiline numberOfLines={3} style={{ marginTop: spacing.sm }} />
          )}
        </View>
      </ScrollView>

      <ScrollEndBanner visible={!isAtBottom} />
      <View style={cs.footer}>
        <Button mode="contained" onPress={() => tryNext(() => { store.setCurrentStep(6); router.push("/interview/step6"); })} style={cs.nextBtn} contentStyle={{ paddingVertical: 8 }} icon="arrow-right">
          Dalej
        </Button>
      </View>

      {/* ─── Modal formularza ─── */}
      <Modal visible={formMode !== null} animationType="slide" onRequestClose={cancelForm} statusBarTranslucent>
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

            {/* Nagłówek modala */}
            <View style={[styles.modalHeader, isEditing && styles.modalHeaderEdit]}>
              <View>
                <Text style={styles.modalTitle}>{isEditing ? "Edytuj członka rodziny" : "Nowy członek rodziny"}</Text>
                <Text style={styles.modalSubtitle}>{isEditing ? "Wprowadź poprawki i zatwierdź" : "Wypełnij dane i zatwierdź"}</Text>
              </View>
              <TouchableOpacity onPress={cancelForm} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeText}>✕ Anuluj</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">

              {/* Losowanie danych */}
              <View style={styles.fakeSection}>
                <Text style={styles.fakeInfo}>ℹ️ Wybierz płeć i losuj fikcyjne dane</Text>
                <View style={styles.fakeGenderRow}>
                  <TouchableOpacity style={[styles.fakeGenderChip, formGender === "F" && styles.fakeGenderChipActive]} onPress={() => setFormGender("F")}>
                    <Text style={[styles.fakeGenderText, formGender === "F" && styles.fakeGenderTextActive]}>♀ Kobieta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.fakeGenderChip, formGender === "M" && styles.fakeGenderChipActive]} onPress={() => setFormGender("M")}>
                    <Text style={[styles.fakeGenderText, formGender === "M" && styles.fakeGenderTextActive]}>♂ Mężczyzna</Text>
                  </TouchableOpacity>
                </View>
                <Button mode="outlined" icon="dice-multiple" onPress={() => { const fake = generateFakeMember(formGender); setFormMember(fake); }} style={styles.fakeBtn}>
                  Losuj dane
                </Button>
              </View>

              {/* 1. Dane podstawowe */}
              <SectionCard title="Dane podstawowe">
                <FormField label="Imię i nazwisko" required value={formMember.name || ""} onChangeText={(v) => set({ name: v })} />

                <View style={styles.row2}>
                  <FormField label="Rok urodzenia" value={formMember.birth_year?.toString() || ""} onChangeText={(v) => set({ birth_year: v ? parseInt(v) : undefined })} keyboardType="numeric" style={{ flex: 1, marginRight: spacing.sm, marginBottom: 0 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLbl}>Płeć</Text>
                    <View style={styles.genderRow}>
                      {GENDER_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.genderChip, formMember.gender === opt.value && styles.genderChipActive]}
                          onPress={() => set({ gender: opt.value })}
                        >
                          <Text style={[styles.genderChipText, formMember.gender === opt.value && styles.genderChipTextActive]}>
                            {opt.value === "K" ? "♀ K" : "♂ M"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <FieldLabel text="Pokrewieństwo" />
                <ChipSelector options={FAMILY_RELATIONS} value={formMember.relation || ""} onSelect={(v) => set({ relation: v })} size="sm" />

                <FieldLabel text="Stan cywilny" />
                <ChipSelector options={MARITAL_STATUS} value={formMember.marital_status || ""} onSelect={(v) => set({ marital_status: v })} size="sm" />
              </SectionCard>

              {/* 2. Wykształcenie i zatrudnienie */}
              <SectionCard title="Wykształcenie i zatrudnienie">
                <FieldLabel text="Wykształcenie" />
                <ChipSelector options={EDUCATION_LEVELS} value={formMember.education || ""} onSelect={(v) => set({ education: v })} size="sm" />

                <FieldLabel text="Status zawodowy" />
                <ChipSelector options={EMPLOYMENT_STATUS} value={formMember.employment_status || ""} onSelect={(v) => set({ employment_status: v })} size="sm" />

                {formMember.employment_status === "bezrobotny" && (
                  <>
                    <FieldLabel text="Zarejestrowany/a w PUP?" />
                    <YesNo value={formMember.is_registered_unemployed ?? null} onChange={(v) => set({ is_registered_unemployed: v })} />

                    <FieldLabel text="Pobiera zasiłek dla bezrobotnych?" />
                    <YesNo value={formMember.has_unemployment_benefit ?? null} onChange={(v) => set({ has_unemployment_benefit: v })} />

                    {formMember.has_unemployment_benefit && (
                      <FormField label="Kwota zasiłku (zł/mies.)" value={formMember.unemployment_benefit_amount || ""} onChangeText={(v) => set({ unemployment_benefit_amount: v.replace(/[^0-9.,]/g, "") })} keyboardType="numeric" placeholder="0.00" />
                    )}
                  </>
                )}

                <FormField label="Kwalifikacje zawodowe" value={formMember.qualifications || ""} onChangeText={(v) => set({ qualifications: v })} placeholder="np. prawo jazdy kat. B, spawacz MIG/MAG" />
                <FormField label="Ostatnie miejsce pracy" value={formMember.last_employment || ""} onChangeText={(v) => set({ last_employment: v })} />
                <FormField label="Aktualne miejsce pracy / szkoła" value={formMember.work_place || ""} onChangeText={(v) => set({ work_place: v })} />
              </SectionCard>

              {/* 3. Dochody */}
              <SectionCard title="Dochody">
                <FormField label="Źródło dochodu" value={formMember.income_source || ""} onChangeText={(v) => set({ income_source: v })} placeholder="np. wynagrodzenie, renta, 800+" />
                <FormField label="Dochód (zł/mies.)" value={formMember.income_amount?.toString() || ""} onChangeText={(v) => set({ income_amount: v ? parseFloat(v.replace(",", ".")) : undefined })} keyboardType="numeric" placeholder="0.00" />
              </SectionCard>

              {/* 4. Zdrowie */}
              <SectionCard title="Zdrowie">
                <FieldLabel text="Ubezpieczenie NFZ?" />
                <YesNo value={formMember.has_health_insurance ?? null} onChange={(v) => set({ has_health_insurance: v })} />

                <FormField label="Choroby / schorzenia" value={formMember.illness_types || ""} onChangeText={(v) => set({ illness_types: v })} placeholder="np. nadciśnienie, cukrzyca, astma" multiline numberOfLines={2} />

                <FieldLabel text="Orzeczenie o niepełnosprawności?" />
                <YesNo value={formMember.has_disability_certificate ?? null} onChange={(v) => set({ has_disability_certificate: v })} />

                {formMember.has_disability_certificate && (
                  <>
                    <FieldLabel text="Stopień niepełnosprawności" />
                    <ChipSelector options={DISABILITY_DEGREES} value={formMember.disability_degree || ""} onSelect={(v) => set({ disability_degree: v })} size="sm" />
                  </>
                )}

                <FieldLabel text="Niezdolność do pracy?" />
                <YesNo value={formMember.has_incapacity_certificate ?? null} onChange={(v) => set({ has_incapacity_certificate: v })} />

                <FieldLabel text="Uzależnienie?" />
                <YesNo value={formMember.has_addiction ?? null} onChange={(v) => set({ has_addiction: v, addiction_types: v ? (formMember.addiction_types ?? []) : [] })} />

                {formMember.has_addiction && (
                  <>
                    <FieldLabel text="Rodzaj uzależnienia" />
                    <ChipSelector multi options={ADDICTION_TYPES} values={formMember.addiction_types ?? []} onSelect={(v) => set({ addiction_types: v })} size="sm" />
                  </>
                )}

                <FormField label="Uwagi zdrowotne" value={formMember.additional_health_info || ""} onChangeText={(v) => set({ additional_health_info: v })} multiline numberOfLines={3} placeholder="Dodatkowe informacje o stanie zdrowia" />
              </SectionCard>

            </ScrollView>

            {/* Przycisk zapisu */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.saveBtn, isEditing && styles.saveBtnEdit]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {isEditing ? "✓ Zapisz zmiany" : "✓ Dodaj do rodziny"}
                </Text>
              </TouchableOpacity>
            </View>

          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={3000} style={styles.snackbar} action={{ label: "OK", onPress: () => setSnackVisible(false) }}>
        <Text style={{ color: "#fff" }}>✓ {snackMsg}</Text>
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: 120 },

  // Lista — głowa rodziny
  mainPersonRow:        { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  mainPersonNameRow:    { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs },
  headBadge:            { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  headBadgeText:        { fontSize: 10, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },
  missingFieldsRow:     { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 5 },
  missingFieldChip:     { backgroundColor: "#FFEBEE", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: colors.error },
  missingFieldText:     { fontSize: 10, fontWeight: "700", color: colors.error },
  missingPersonRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFF8E1", borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.warning },
  missingPersonText:    { fontSize: fontSize.sm, color: colors.warning, flex: 1 },
  missingPersonLink:    { fontSize: fontSize.sm, color: colors.primary, fontWeight: "700" },

  // Lista — członkowie
  emptyText:            { fontSize: fontSize.sm, color: colors.text.disabled, fontStyle: "italic", marginTop: spacing.xs, marginBottom: spacing.sm },
  memberRow:            { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  memberName:           { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  memberSub:            { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  memberBadgeRow:       { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  memberBadge:          { backgroundColor: "#E8F5E9", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  memberBadgeText:      { fontSize: 10, fontWeight: "600", color: colors.success },
  memberBadgeWarn:      { backgroundColor: "#FFF3E0" },
  memberBadgeTextWarn:  { color: colors.warning },
  memberBadgeErr:       { backgroundColor: "#FFEBEE" },
  memberBadgeTextErr:   { color: colors.error },
  editBtn:              { padding: spacing.sm, marginRight: 2 },
  editText:             { color: colors.primary, fontSize: fontSize.lg, fontWeight: "700" },
  removeBtn:            { padding: spacing.sm },
  removeText:           { color: colors.error, fontSize: fontSize.lg, fontWeight: "700" },
  addMemberBtn:         { marginTop: spacing.sm, borderColor: colors.primary },

  // Modal — szkielet
  modalSafe:            { flex: 1, backgroundColor: colors.background },
  modalHeader:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalHeaderEdit:      { backgroundColor: colors.secondary },
  modalTitle:           { color: "#fff", fontSize: fontSize.md, fontWeight: "700" },
  modalSubtitle:        { color: "#ffffffaa", fontSize: fontSize.xs },
  modalScroll:          { padding: spacing.md, paddingBottom: 24, gap: spacing.md },
  modalFooter:          { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  closeBtn:             { padding: spacing.xs },
  closeText:            { color: "#fff", fontSize: fontSize.sm, fontWeight: "600" },

  // Modal — losowanie
  fakeSection:          { backgroundColor: colors.primaryLight, borderRadius: 8, padding: spacing.sm },
  fakeInfo:             { fontSize: fontSize.xs, color: colors.secondary, marginBottom: spacing.sm },
  fakeGenderRow:        { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  fakeGenderChip:       { flex: 1, paddingVertical: spacing.xs, borderRadius: 20, borderWidth: 1, borderColor: colors.primary, alignItems: "center" },
  fakeGenderChipActive: { backgroundColor: colors.primary },
  fakeGenderText:       { fontSize: fontSize.sm, fontWeight: "600", color: colors.primary },
  fakeGenderTextActive: { color: "#fff" },
  fakeBtn:              { borderColor: colors.primary },

  // Modal — sekcje
  sectionCard:          { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  sectionHeader:        { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sectionTitle:         { fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.8 },
  sectionBody:          { padding: spacing.md, gap: spacing.xs },

  // Pola wewnątrz sekcji
  fieldLbl:             { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary, marginTop: spacing.xs },
  row2:                 { flexDirection: "row", gap: spacing.sm },
  genderRow:            { flexDirection: "row", gap: spacing.sm },
  genderChip:           { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" },
  genderChipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  genderChipText:       { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary },
  genderChipTextActive: { color: "#fff" },

  // Przycisk zapisu
  saveBtn:              { backgroundColor: colors.success, borderRadius: 10, paddingVertical: spacing.md, alignItems: "center" },
  saveBtnEdit:          { backgroundColor: colors.secondary },
  saveBtnText:          { color: "#fff", fontSize: fontSize.md, fontWeight: "700", letterSpacing: 0.3 },
  snackbar:             { backgroundColor: colors.success },
});
