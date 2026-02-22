/**
 * Krok 5 — Sytuacja rodzinna
 */
import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInterviewStore, FamilyMember } from "@/store/interviewStore";
import { FAMILY_RELATIONS, EDUCATION_LEVELS, EMPLOYMENT_STATUS } from "@/constants/formOptions";
import { colors, spacing, fontSize } from "@/constants/theme";
import { cs } from "@/constants/commonStyles";
import FormField from "@/components/ui/FormField";
import StepHeader from "@/components/ui/StepHeader";
import YesNo from "@/components/ui/YesNo";
import ChipSelector from "@/components/ui/ChipSelector";
import { generateFakeMember } from "@/constants/fakeData";

type FormMode = "add" | "edit" | null;

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

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMember, setFormMember] = useState<Partial<FamilyMember>>({});
  const [formGender, setFormGender] = useState<"F" | "M">("F");
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");

  const openAddForm = () => {
    setFormMember({});
    setFormGender("F");
    setEditingId(null);
    setFormMode("add");
  };

  const openEditForm = (member: FamilyMember) => {
    setFormMember({ ...member });
    setFormGender("F");
    setEditingId(member.id);
    setFormMode("edit");
  };

  const cancelForm = () => {
    setFormMode(null);
    setFormMember({});
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formMember.name?.trim()) {
      Alert.alert("Brak danych", "Podaj imię i nazwisko członka rodziny.");
      return;
    }
    const name = formMember.name.trim();

    if (formMode === "add") {
      store.addFamilyMember({
        id: Date.now().toString(),
        name,
        birth_year: formMember.birth_year,
        relation: formMember.relation,
        education: formMember.education,
        work_place: formMember.work_place,
        employment_status: formMember.employment_status,
        income_source: formMember.income_source,
        income_amount: formMember.income_amount,
      });
      setSnackMsg(`Dodano: ${name}`);
    } else if (formMode === "edit" && editingId) {
      store.updateFamilyMember(editingId, {
        name,
        birth_year: formMember.birth_year,
        relation: formMember.relation,
        education: formMember.education,
        work_place: formMember.work_place,
        employment_status: formMember.employment_status,
        income_source: formMember.income_source,
        income_amount: formMember.income_amount,
      });
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

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={cs.title}>Sytuacja rodzinna</Text>

        {/* Lista członków rodziny */}
        <View style={cs.card}>
          <Text style={cs.cardTitle}>Skład rodziny</Text>

          {/* Głowa rodziny — zawsze pierwsza, dane z kroku 1 */}
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
                  {[m.relation, m.birth_year ? `ur. ${m.birth_year}` : null, m.income_amount ? `${m.income_amount.toFixed(2)} zł` : null].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <TouchableOpacity onPress={() => openEditForm(m)} style={styles.editBtn}>
                <Text style={styles.editText}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => store.removeFamilyMember(m.id)} style={styles.removeBtn}>
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

      <View style={cs.footer}>
        <Button mode="contained" onPress={() => { store.setCurrentStep(6); router.push("/interview/step6"); }} style={cs.nextBtn} contentStyle={{ paddingVertical: 8 }} icon="arrow-right">
          Dalej
        </Button>
      </View>

      {/* Modal formularza dodawania / edycji */}
      <Modal
        visible={formMode !== null}
        animationType="slide"
        onRequestClose={cancelForm}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            {/* Nagłówek modala */}
            <View style={[styles.modalHeader, isEditing && styles.modalHeaderEdit]}>
              <View>
                <Text style={styles.modalTitle}>
                  {isEditing ? "Edytuj członka rodziny" : "Nowy członek rodziny"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isEditing ? "Wprowadź poprawki i zatwierdź" : "Wypełnij dane i zatwierdź"}
                </Text>
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
                  <TouchableOpacity
                    style={[styles.fakeGenderChip, formGender === "F" && styles.fakeGenderChipActive]}
                    onPress={() => setFormGender("F")}
                  >
                    <Text style={[styles.fakeGenderText, formGender === "F" && styles.fakeGenderTextActive]}>♀ Kobieta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.fakeGenderChip, formGender === "M" && styles.fakeGenderChipActive]}
                    onPress={() => setFormGender("M")}
                  >
                    <Text style={[styles.fakeGenderText, formGender === "M" && styles.fakeGenderTextActive]}>♂ Mężczyzna</Text>
                  </TouchableOpacity>
                </View>
                <Button mode="outlined" icon="dice-multiple" onPress={() => setFormMember(generateFakeMember(formGender))} style={styles.fakeBtn}>
                  Losuj dane
                </Button>
              </View>

              {/* Pola formularza */}
              <FormField label="Imię i nazwisko" required value={formMember.name || ""} onChangeText={(v) => setFormMember((p) => ({ ...p, name: v }))} style={{ marginHorizontal: spacing.md }} />

              <View style={styles.row2}>
                <FormField
                  label="Rok urodzenia"
                  value={formMember.birth_year?.toString() || ""}
                  onChangeText={(v) => setFormMember((p) => ({ ...p, birth_year: v ? parseInt(v) : undefined }))}
                  keyboardType="numeric"
                  style={{ flex: 1, marginRight: spacing.sm, marginBottom: 0 }}
                />
                <FormField
                  label="Dochód (zł/mies.)"
                  value={formMember.income_amount?.toString() || ""}
                  onChangeText={(v) => setFormMember((p) => ({ ...p, income_amount: v ? parseFloat(v) : undefined }))}
                  keyboardType="numeric"
                  style={{ flex: 1, marginBottom: 0 }}
                />
              </View>

              <Text style={styles.fieldLabel}>Pokrewieństwo</Text>
              <ChipSelector
                options={FAMILY_RELATIONS}
                value={formMember.relation || ""}
                onSelect={(v) => setFormMember((p) => ({ ...p, relation: v }))}
                containerStyle={{ paddingHorizontal: spacing.md }}
              />

              <Text style={styles.fieldLabel}>Wykształcenie</Text>
              <ChipSelector
                options={EDUCATION_LEVELS}
                value={formMember.education || ""}
                onSelect={(v) => setFormMember((p) => ({ ...p, education: v }))}
                containerStyle={{ paddingHorizontal: spacing.md }}
              />

              <Text style={styles.fieldLabel}>Status zawodowy</Text>
              <ChipSelector
                options={EMPLOYMENT_STATUS}
                value={formMember.employment_status || ""}
                onSelect={(v) => setFormMember((p) => ({ ...p, employment_status: v }))}
                containerStyle={{ paddingHorizontal: spacing.md }}
              />

              <FormField label="Miejsce pracy / szkoła" value={formMember.work_place || ""} onChangeText={(v) => setFormMember((p) => ({ ...p, work_place: v }))} style={{ marginHorizontal: spacing.md }} />
            </ScrollView>

            {/* Przycisk zapisu — sticky na dole modala */}
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

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={3000}
        style={styles.snackbar}
        action={{ label: "OK", onPress: () => setSnackVisible(false) }}
      >
        <Text style={{ color: "#fff" }}>✓ {snackMsg}</Text>
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: 120 },

  // Karta listy
  emptyText: { fontSize: fontSize.sm, color: colors.text.disabled, fontStyle: "italic", marginTop: spacing.xs, marginBottom: spacing.sm },

  // Głowa rodziny
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
  memberRow:            { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  memberName:           { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  memberSub:            { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  editBtn:              { padding: spacing.sm, marginRight: 2 },
  editText:             { color: colors.primary, fontSize: fontSize.lg, fontWeight: "700" },
  removeBtn:            { padding: spacing.sm },
  removeText:           { color: colors.error, fontSize: fontSize.lg, fontWeight: "700" },
  addMemberBtn:         { marginTop: spacing.sm, borderColor: colors.primary },

  // Modal
  modalSafe:            { flex: 1, backgroundColor: colors.background },
  modalHeader:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalHeaderEdit:      { backgroundColor: colors.secondary },
  modalTitle:           { color: "#fff", fontSize: fontSize.md, fontWeight: "700" },
  modalSubtitle:        { color: "#ffffffaa", fontSize: fontSize.xs },
  modalScroll:          { paddingBottom: 20 },
  modalFooter:          { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  closeBtn:             { padding: spacing.xs },
  closeText:            { color: "#fff", fontSize: fontSize.sm, fontWeight: "600" },

  // Sekcja losowania
  fakeSection:          { backgroundColor: colors.primaryLight, margin: spacing.md, borderRadius: 8, padding: spacing.sm },
  fakeInfo:             { fontSize: fontSize.xs, color: colors.secondary, marginBottom: spacing.sm },
  fakeGenderRow:        { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  fakeGenderChip:       { flex: 1, paddingVertical: spacing.xs, borderRadius: 20, borderWidth: 1, borderColor: colors.primary, alignItems: "center" },
  fakeGenderChipActive: { backgroundColor: colors.primary },
  fakeGenderText:       { fontSize: fontSize.sm, fontWeight: "600", color: colors.primary },
  fakeGenderTextActive: { color: "#fff" },
  fakeBtn:              { borderColor: colors.primary },

  // Etykiety pól w modalu (z paddingHorizontal bo modal nie ma globalnego paddingu)
  fieldLabel: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary, marginBottom: spacing.xs, marginTop: spacing.sm, paddingHorizontal: spacing.md },
  row2:       { flexDirection: "row", paddingHorizontal: spacing.md, marginBottom: spacing.sm },

  // Przycisk zapisu
  saveBtn:     { margin: spacing.md, backgroundColor: colors.success, borderRadius: 10, paddingVertical: spacing.md, alignItems: "center" },
  saveBtnEdit: { backgroundColor: colors.secondary },
  saveBtnText: { color: "#fff", fontSize: fontSize.md, fontWeight: "700", letterSpacing: 0.3 },

  snackbar: { backgroundColor: colors.success },
});
