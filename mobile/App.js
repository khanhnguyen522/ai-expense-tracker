import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

const API = "http://192.168.1.20:3000";

export default function App() {
  const [receipts, setReceipts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const res = await axios.get(`${API}/receipts`);
      setReceipts(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Camera permission is required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      exif: false,
      base64: false,
    });

    if (!result.canceled) {
      uploadReceipt(result.assets[0]);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
      base64: true,
    });

    if (!result.canceled) {
      uploadReceipt(result.assets[0]);
    }
  };

  const uploadReceipt = async (image) => {
    setUploading(true);
    setMessage("Claude is reading your receipt...");

    const formData = new FormData();

    if (image.base64) {
      // Use base64 directly - already converted from HEIC to JPEG
      formData.append("receipt", {
        uri: image.uri,
        type: "image/jpeg",
        name: "receipt.jpg",
      });
    } else {
      formData.append("receipt", {
        uri: image.uri,
        type: "image/jpeg",
        name: "receipt.jpg",
      });
    }

    try {
      const res = await axios.post(`${API}/receipts`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(
        `Found: ${res.data.extracted.store_name} - $${res.data.extracted.amount}`,
      );
      fetchReceipts();
    } catch (err) {
      console.log(err);
      setMessage("Could not read receipt. Try another image.");
    }
    setUploading(false);
  };

  const deleteReceipt = async (id) => {
    await axios.delete(`${API}/receipts/${id}`);
    fetchReceipts();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const totalSpent = receipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>AI Expense Tracker</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={takePhoto}>
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={pickFromGallery}
          >
            <Text style={styles.buttonText}>Pick from Gallery</Text>
          </TouchableOpacity>
        </View>

        {uploading && <ActivityIndicator size="large" color="#0088FE" />}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Spent</Text>
            <Text style={styles.statValue}>${totalSpent.toFixed(2)}</Text>
          </View>
          <View style={[styles.statBox, { background: "#00C49F" }]}>
            <Text style={styles.statLabel}>Receipts</Text>
            <Text style={styles.statValue}>{receipts.length}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Receipts</Text>
        {receipts.map((r) => (
          <View key={r.id} style={styles.receiptCard}>
            <View>
              <Text style={styles.storeName}>{r.store_name}</Text>
              <Text style={styles.category}>{r.category}</Text>
              <Text style={styles.date}>{formatDate(r.date)}</Text>
            </View>
            <View style={styles.receiptRight}>
              <Text style={styles.amount}>
                ${parseFloat(r.amount).toFixed(2)}
              </Text>
              <TouchableOpacity onPress={() => deleteReceipt(r.id)}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", padding: 20 },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  button: {
    flex: 1,
    background: "#0088FE",
    backgroundColor: "#0088FE",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: "#00C49F",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold" },
  message: { paddingHorizontal: 20, marginBottom: 10, color: "green" },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#0088FE",
    padding: 15,
    borderRadius: 10,
  },
  statLabel: { color: "white", fontSize: 12 },
  statValue: { color: "white", fontSize: 24, fontWeight: "bold" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  receiptCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  storeName: { fontWeight: "bold", fontSize: 16 },
  category: { color: "#666", fontSize: 12, marginTop: 2 },
  date: { color: "#666", fontSize: 12, marginTop: 2 },
  receiptRight: { alignItems: "flex-end" },
  amount: { color: "#0088FE", fontWeight: "bold", fontSize: 18 },
  deleteBtn: { color: "#ff4444", fontSize: 12, marginTop: 5 },
});
