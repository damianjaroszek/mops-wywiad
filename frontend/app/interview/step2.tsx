/**
 * Krok 2 — Sytuacja mieszkaniowa
 */
import React from "react";
import { View, ScrollView, StyleSheet, Text, Switch } from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInterviewStore } from "@/store/interviewStore";
import { APARTMENT_TYPES, HEATING_TYPES, APARTMENT_CONDITION } from "@/constants/formOptions";
import { colors, spacing } from "@/constants/theme";
import { cs } from "@/constants/commonStyles";
import FormField from "@/components/ui/FormField";
import StepHeader from "@/components/ui/StepHeader";
import RadioOptionList from "@/components/ui/RadioOptionList";

const BOOL_FIELDS = [
  { key: "has_cold_water" as const, label: "Zimna woda" },
  { key: "has_hot_water" as const, label: "Ciepła woda" },
  { key: "has_bathroom" as const, label: "Łazienka" },
  { key: "has_wc" as const, label: "WC" },
  { key: "has_gas" as const, label: "Gaz" },
];

export default function Step2() {
  const store = useInterviewStore();
  const h = store.formData.housing;

  const handleNext = () => {
    store.setCurrentStep(3);
    router.push("/interview/step3");
  };

  return (
    <SafeAreaView style={cs.safe}>
      <StepHeader step={2} />

      <ScrollView contentContainerStyle={cs.scroll}>
        <Text style={cs.title}>Sytuacja mieszkaniowa</Text>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Rodzaj mieszkania</Text>
          <RadioOptionList
            options={APARTMENT_TYPES}
            value={h.apartment_type}
            onValueChange={(v) => store.updateHousing({ apartment_type: v })}
          />
        </View>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Parametry lokalu</Text>
          <View style={styles.row2}>
            <FormField
              label="Liczba izb"
              value={h.rooms_count}
              onChangeText={(v) => store.updateHousing({ rooms_count: v.replace(/[^0-9]/g, "") })}
              keyboardType="numeric"
              style={{ flex: 1, marginRight: spacing.sm, marginBottom: 0 }}
            />
            <FormField
              label="Piętro"
              value={h.floor}
              onChangeText={(v) => store.updateHousing({ floor: v.replace(/[^0-9\-]/g, "") })}
              keyboardType="numeric"
              style={{ flex: 1, marginBottom: 0 }}
            />
          </View>
          <FormField
            label="Miejsca do spania"
            value={h.sleeping_places}
            onChangeText={(v) => store.updateHousing({ sleeping_places: v.replace(/[^0-9]/g, "") })}
            keyboardType="numeric"
            style={{ marginTop: spacing.md }}
          />
        </View>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Wyposażenie</Text>
          {BOOL_FIELDS.map(({ key, label }) => (
            <View key={key} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{label}</Text>
              <Switch
                value={Boolean(h[key])}
                onValueChange={(v) => store.updateHousing({ [key]: v } as any)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={h[key] ? colors.primaryDark : "#f4f3f4"}
              />
            </View>
          ))}
        </View>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Ogrzewanie</Text>
          <RadioOptionList
            options={HEATING_TYPES}
            value={h.heating_type}
            onValueChange={(v) => store.updateHousing({ heating_type: v })}
          />
        </View>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Stan techniczny mieszkania</Text>
          <RadioOptionList
            options={APARTMENT_CONDITION}
            value={h.apartment_condition}
            onValueChange={(v) => store.updateHousing({ apartment_condition: v })}
          />
        </View>
      </ScrollView>

      <View style={cs.footer}>
        <Button mode="contained" onPress={handleNext} style={cs.nextBtn} contentStyle={{ paddingVertical: 8 }} icon="arrow-right">
          Dalej
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  switchRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  switchLabel: { fontSize: 15, color: colors.text.primary },
  row2:        { flexDirection: "row" },
});
