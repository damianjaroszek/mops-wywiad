import * as ImagePicker from "expo-image-picker";
import { api } from "./api";

export interface ScanResult {
  step: number;
  extracted_data: Record<string, any>;
}

export async function pickAndScanSection(step: number): Promise<ScanResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Brak dostępu do aparatu. Przyznaj uprawnienia w ustawieniach.");
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    base64: true,
    allowsEditing: true,
    aspect: [3, 4],
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error("CANCELLED");
  }

  const asset = result.assets[0];
  if (!asset.base64) {
    throw new Error("Nie udało się odczytać zdjęcia. Spróbuj ponownie.");
  }

  const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const mediaType = ext === "png" ? "image/png" : "image/jpeg";

  const response = await api.post<ScanResult>("/scan-section", {
    step,
    image_base64: asset.base64,
    image_media_type: mediaType,
  });

  return response.data;
}

export async function pickFromLibraryAndScanSection(step: number): Promise<ScanResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Brak dostępu do galerii. Przyznaj uprawnienia w ustawieniach.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    base64: true,
    allowsEditing: true,
    aspect: [3, 4],
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error("CANCELLED");
  }

  const asset = result.assets[0];
  if (!asset.base64) {
    throw new Error("Nie udało się odczytać zdjęcia. Spróbuj ponownie.");
  }

  const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const mediaType = ext === "png" ? "image/png" : "image/jpeg";

  const response = await api.post<ScanResult>("/scan-section", {
    step,
    image_base64: asset.base64,
    image_media_type: mediaType,
  });

  return response.data;
}
