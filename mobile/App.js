import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { PieChart } from "react-native-chart-kit";

const API = "https://api.expense-tracker.sbs";
const SCREEN_WIDTH = Dimensions.get("window").width;
const MONTHLY_BUDGET = 300;

const CATEGORY_CONFIG = {
  groceries: { color: "#0C447C", bg: "#E6F1FB", icon: "🛒" },
  food: { color: "#085041", bg: "#E1F5EE", icon: "🍔" },
  dining: { color: "#085041", bg: "#E1F5EE", icon: "🍽️" },
  restaurant: { color: "#633806", bg: "#FAEEDA", icon: "☕" },
  shopping: { color: "#3C3489", bg: "#EEEDFE", icon: "🛍️" },
  transport: { color: "#27500A", bg: "#EAF3DE", icon: "🚗" },
  entertainment: { color: "#72243E", bg: "#FBEAF0", icon: "🎬" },
  health: { color: "#791F1F", bg: "#FCEBEB", icon: "💊" },
  other: { color: "#444441", bg: "#F1EFE8", icon: "📄" },
};

const PIE_COLORS = [
  "#185FA5",
  "#0F6E56",
  "#BA7517",
  "#533AB7",
  "#3B6D11",
  "#993556",
];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getCategoryConfig = (cat) =>
  CATEGORY_CONFIG[cat?.toLowerCase()] || CATEGORY_CONFIG.other;
const formatCurrency = (val) => `$${parseFloat(val).toFixed(2)}`;
const formatDate = (dateString) => {
  if (!dateString) return "No date";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function App() {
  const [receipts, setReceipts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [insights, setInsights] = useState("");
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth()));
  const [filterYear, setFilterYear] = useState(
    String(new Date().getFullYear()),
  );
  const [showFilterModal, setShowFilterModal] = useState(false);

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
      Alert.alert("Permission needed", "Camera permission is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      exif: false,
      base64: false,
    });
    if (!result.canceled) uploadReceipt(result.assets[0]);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
      base64: true,
    });
    if (!result.canceled) uploadReceipt(result.assets[0]);
  };

  const uploadReceipt = async (image) => {
    setUploading(true);
    setMessage({ type: "loading", text: "Scanning your receipt..." });
    const formData = new FormData();
    formData.append("receipt", {
      uri: image.uri,
      type: "image/jpeg",
      name: "receipt.jpg",
    });
    try {
      const res = await axios.post(`${API}/receipts`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage({
        type: "success",
        text: `Found: ${res.data.extracted.store_name} — ${formatCurrency(res.data.extracted.amount)}`,
      });
      fetchReceipts();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.log(err);
      setMessage({
        type: "error",
        text: "Could not read receipt. Try a clearer image.",
      });
      setTimeout(() => setMessage(null), 4000);
    }
    setUploading(false);
  };

  const getInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await axios.get(`${API}/insights`);
      setInsights(res.data.insights);
    } catch {}
    setLoadingInsights(false);
  };

  const handleInsightsPress = () => {
    setShowInsights(true);
    if (!insights) getInsights();
  };

  const deleteReceipt = (id) => {
    Alert.alert("Delete receipt", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await axios.delete(`${API}/receipts/${id}`);
          fetchReceipts();
        },
      },
    ]);
  };

  const availableYears = [
    ...new Set(
      receipts
        .map((r) => (r.date ? new Date(r.date).getFullYear() : null))
        .filter(Boolean),
    ),
  ].sort((a, b) => b - a);

  const filteredReceipts = receipts.filter((r) => {
    if (!r.date) return filterMonth === "all" && filterYear === "all";
    const date = new Date(r.date);
    const monthMatch =
      filterMonth === "all" || date.getMonth() === parseInt(filterMonth);
    const yearMatch =
      filterYear === "all" || date.getFullYear() === parseInt(filterYear);
    return monthMatch && yearMatch;
  });

  const totalSpent = filteredReceipts.reduce(
    (s, r) => s + parseFloat(r.amount),
    0,
  );

  const categoryTotals = filteredReceipts.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + parseFloat(r.amount);
    return acc;
  }, {});

  const topCategory =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const pieData = Object.entries(categoryTotals).map(([name, value], i) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    population: parseFloat(value.toFixed(2)),
    color: PIE_COLORS[i % PIE_COLORS.length],
    legendFontColor: "#888",
    legendFontSize: 12,
  }));

  // Budget
  const isMonthView = filterMonth !== "all" && filterYear !== "all";
  const budgetPct = Math.min((totalSpent / MONTHLY_BUDGET) * 100, 100);
  const overBudget = totalSpent > MONTHLY_BUDGET;
  const overAmount = totalSpent - MONTHLY_BUDGET;
  const remaining = MONTHLY_BUDGET - totalSpent;
  const barColor = overBudget
    ? "#A32D2D"
    : budgetPct > 80
      ? "#BA7517"
      : "#185FA5";

  const filterLabel = () => {
    if (filterMonth === "all" && filterYear === "all") return "All time";
    if (filterMonth === "all") return `${filterYear}`;
    if (filterYear === "all") return FULL_MONTHS[parseInt(filterMonth)];
    return `${MONTHS[parseInt(filterMonth)]} ${filterYear}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6F3" />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Expense tracker</Text>
          <Text style={styles.headerSub}>
            Receipt scanning & spending insights
          </Text>
        </View>

        {/* Upload Buttons */}
        <View style={styles.section}>
          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={[styles.uploadBtn, uploading && styles.disabledBtn]}
              onPress={takePhoto}
              disabled={uploading}
              activeOpacity={0.82}
            >
              <Text style={styles.uploadBtnIcon}>📷</Text>
              <Text style={styles.uploadBtnText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.uploadBtnSecondary,
                uploading && styles.disabledBtn,
              ]}
              onPress={pickFromGallery}
              disabled={uploading}
              activeOpacity={0.82}
            >
              <Text style={styles.uploadBtnIcon}>🖼️</Text>
              <Text style={styles.uploadBtnTextSecondary}>From gallery</Text>
            </TouchableOpacity>
          </View>

          {uploading && (
            <View style={styles.statusLoading}>
              <ActivityIndicator size="small" color="#185FA5" />
              <Text style={styles.statusLoadingText}>
                Scanning your receipt...
              </Text>
            </View>
          )}

          {message && !uploading && (
            <View
              style={[
                styles.statusMsg,
                message.type === "success"
                  ? styles.statusSuccess
                  : message.type === "error"
                    ? styles.statusError
                    : styles.statusInfo,
              ]}
            >
              <Text
                style={[
                  styles.statusIcon,
                  {
                    color:
                      message.type === "success"
                        ? "#085041"
                        : message.type === "error"
                          ? "#791F1F"
                          : "#0C447C",
                  },
                ]}
              >
                {message.type === "success" ? "✓" : "✕"}
              </Text>
              <Text
                style={[
                  styles.statusMsgText,
                  {
                    color:
                      message.type === "success"
                        ? "#085041"
                        : message.type === "error"
                          ? "#791F1F"
                          : "#0C447C",
                  },
                ]}
              >
                {message.text}
              </Text>
            </View>
          )}
        </View>

        {/* Filter Bar */}
        <View style={styles.section}>
          <View style={styles.filterBar}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={styles.filterText}>Showing </Text>
              <Text style={styles.filterValue}>{filterLabel()}</Text>
            </View>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setShowFilterModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.filterBtnText}>Filter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total spent</Text>
            <Text style={[styles.statValue, { color: "#185FA5" }]}>
              {formatCurrency(totalSpent)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Receipts</Text>
            <Text style={[styles.statValue, { color: "#0F6E56" }]}>
              {filteredReceipts.length}
            </Text>
          </View>
          {topCategory && (
            <View style={[styles.statCard, { flex: 2 }]}>
              <Text style={styles.statLabel}>Top category</Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: "#BA7517",
                    fontSize: 15,
                    textTransform: "capitalize",
                  },
                ]}
              >
                {getCategoryConfig(topCategory).icon} {topCategory}
              </Text>
            </View>
          )}
        </View>

        {/* Budget bar — only when viewing a specific month */}
        {isMonthView && filteredReceipts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.card}>
              {/* Header row */}
              <View style={styles.budgetHeader}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text style={styles.cardTitle}>Monthly budget</Text>
                  {overBudget && (
                    <View style={styles.overBadge}>
                      <Text style={styles.overBadgeText}>
                        Over by {formatCurrency(overAmount)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: overBudget ? "#A32D2D" : "#555",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "700",
                      color: overBudget ? "#A32D2D" : "#1a1a1a",
                    }}
                  >
                    {formatCurrency(totalSpent)}
                  </Text>
                  <Text style={{ color: "#bbb" }}>
                    {" "}
                    / {formatCurrency(MONTHLY_BUDGET)}
                  </Text>
                </Text>
              </View>

              {/* Progress bar */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${budgetPct}%`, backgroundColor: barColor },
                  ]}
                />
              </View>

              {/* Sub-labels */}
              <View style={styles.barLabels}>
                <Text
                  style={[
                    styles.barLabel,
                    { color: overBudget ? "#A32D2D" : "#aaa" },
                  ]}
                >
                  {overBudget
                    ? "Budget exceeded"
                    : `${formatCurrency(remaining)} remaining`}
                </Text>
                <Text style={styles.barLabel}>
                  {Math.round(budgetPct)}% used
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Chart */}
        {pieData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Spending by category</Text>
                {receipts.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.insightPill,
                      loadingInsights && styles.disabledBtn,
                    ]}
                    onPress={handleInsightsPress}
                    disabled={loadingInsights}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.insightPillText}>
                      {loadingInsights ? "Analyzing..." : "✦ Insights"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <PieChart
                data={pieData}
                width={SCREEN_WIDTH - 64}
                height={170}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="16"
                hasLegend={false}
              />
              <View style={styles.legendRow}>
                {pieData.map((item, i) => (
                  <View key={item.name} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: PIE_COLORS[i % PIE_COLORS.length] },
                      ]}
                    />
                    <Text style={styles.legendName}>{item.name}</Text>
                    <Text style={styles.legendValue}>
                      {formatCurrency(item.population)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Insights panel */}
        {showInsights && (
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Spending insights</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {insights && !loadingInsights && (
                    <TouchableOpacity onPress={getInsights}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#185FA5",
                          fontWeight: "600",
                        }}
                      >
                        Refresh
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => setShowInsights(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 14, color: "#bbb" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {loadingInsights ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  <ActivityIndicator size="small" color="#185FA5" />
                  <Text style={{ fontSize: 13, color: "#aaa" }}>
                    Analyzing your spending...
                  </Text>
                </View>
              ) : (
                insights
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((line, i) => (
                    <Text key={i} style={styles.insightLine}>
                      {line.replace(/\*\*/g, "")}
                    </Text>
                  ))
              )}
            </View>
          </View>
        )}

        {/* Receipts List */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.listHeader}>
              <Text style={styles.cardTitle}>Recent receipts</Text>
              <Text style={styles.listCount}>
                {filteredReceipts.length} item
                {filteredReceipts.length !== 1 ? "s" : ""}
              </Text>
            </View>
            {filteredReceipts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🧾</Text>
                <Text style={styles.emptyText}>
                  {receipts.length === 0
                    ? "No receipts yet"
                    : "No receipts for this period"}
                </Text>
                <Text style={styles.emptySubtext}>
                  {receipts.length === 0
                    ? "Take a photo or pick from your gallery"
                    : "Try a different month or year"}
                </Text>
              </View>
            ) : (
              filteredReceipts.map((r, index) => {
                const cat = getCategoryConfig(r.category);
                return (
                  <View
                    key={r.id}
                    style={[
                      styles.receiptRow,
                      index === filteredReceipts.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.receiptIconBox,
                        { backgroundColor: cat.bg },
                      ]}
                    >
                      <Text style={styles.receiptIconText}>{cat.icon}</Text>
                    </View>
                    <View style={styles.receiptInfo}>
                      <Text style={styles.receiptStore} numberOfLines={1}>
                        {r.store_name}
                      </Text>
                      <View style={styles.receiptMeta}>
                        <View
                          style={[styles.badge, { backgroundColor: cat.bg }]}
                        >
                          <Text
                            style={[styles.badgeText, { color: cat.color }]}
                          >
                            {r.category}
                          </Text>
                        </View>
                        <Text style={styles.receiptDate}>
                          {formatDate(r.date)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.receiptRight}>
                      <Text style={styles.receiptAmount}>
                        {formatCurrency(parseFloat(r.amount))}
                      </Text>
                      <TouchableOpacity
                        onPress={() => deleteReceipt(r.id)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter receipts</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionLabel}>Month</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 22 }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    filterMonth === "all" && styles.chipActive,
                  ]}
                  onPress={() => setFilterMonth("all")}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filterMonth === "all" && styles.chipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {FULL_MONTHS.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.chip,
                      filterMonth === String(i) && styles.chipActive,
                    ]}
                    onPress={() => setFilterMonth(String(i))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filterMonth === String(i) && styles.chipTextActive,
                      ]}
                    >
                      {MONTHS[i]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.modalSectionLabel}>Year</Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 28,
              }}
            >
              <TouchableOpacity
                style={[styles.chip, filterYear === "all" && styles.chipActive]}
                onPress={() => setFilterYear("all")}
              >
                <Text
                  style={[
                    styles.chipText,
                    filterYear === "all" && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {availableYears.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[
                    styles.chip,
                    filterYear === String(y) && styles.chipActive,
                  ]}
                  onPress={() => setFilterYear(String(y))}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filterYear === String(y) && styles.chipTextActive,
                    ]}
                  >
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setShowFilterModal(false)}
              activeOpacity={0.82}
            >
              <Text style={styles.applyBtnText}>Apply filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F6F3" },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.4,
  },
  headerSub: { fontSize: 12, color: "#aaa", marginTop: 3 },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  uploadRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  uploadBtn: {
    flex: 1,
    backgroundColor: "#185FA5",
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  uploadBtnSecondary: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 0.5,
    borderColor: "#D8D6CF",
  },
  disabledBtn: { opacity: 0.5 },
  uploadBtnIcon: { fontSize: 15 },
  uploadBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  uploadBtnTextSecondary: { color: "#333", fontWeight: "600", fontSize: 14 },
  statusLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E6F1FB",
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#B5D4F4",
  },
  statusLoadingText: { color: "#0C447C", fontSize: 13, fontWeight: "500" },
  statusMsg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  statusSuccess: { backgroundColor: "#E1F5EE", borderColor: "#9FE1CB" },
  statusError: { backgroundColor: "#FCEBEB", borderColor: "#F7C1C1" },
  statusInfo: { backgroundColor: "#E6F1FB", borderColor: "#B5D4F4" },
  statusIcon: { fontSize: 14, fontWeight: "600" },
  statusMsgText: { fontSize: 13, fontWeight: "500", flex: 1, lineHeight: 18 },
  filterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 11,
    borderWidth: 0.5,
    borderColor: "#E8E6DF",
  },
  filterText: { fontSize: 13, color: "#aaa" },
  filterValue: { fontSize: 13, color: "#333", fontWeight: "600" },
  filterBtn: {
    backgroundColor: "#F1EFE8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterBtnText: { fontSize: 13, color: "#666", fontWeight: "600" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#F1EFE8",
    borderRadius: 10,
    padding: 14,
  },
  statLabel: {
    fontSize: 10,
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: { fontSize: 19, fontWeight: "700", letterSpacing: -0.4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 0.5,
    borderColor: "#E8E6DF",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  barTrack: {
    height: 8,
    backgroundColor: "#F1EFE8",
    borderRadius: 6,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 6 },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  barLabel: { fontSize: 11, color: "#aaa" },
  overBadge: {
    backgroundColor: "#FCEBEB",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: "#F7C1C1",
  },
  overBadgeText: { fontSize: 11, fontWeight: "600", color: "#A32D2D" },
  insightPill: {
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#D8D6CF",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  insightPillText: { fontSize: 12, color: "#555", fontWeight: "500" },
  legendRow: { marginTop: 12, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  legendName: {
    fontSize: 13,
    color: "#666",
    textTransform: "capitalize",
    flex: 1,
  },
  legendValue: { fontSize: 13, fontWeight: "600", color: "#333" },
  insightLine: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    marginBottom: 9,
    marginTop: 4,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  listCount: { fontSize: 12, color: "#bbb" },
  emptyState: { alignItems: "center", paddingVertical: 28 },
  emptyIcon: { fontSize: 34, marginBottom: 10 },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#444",
    marginBottom: 4,
  },
  emptySubtext: { fontSize: 13, color: "#bbb", textAlign: "center" },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0EEE8",
    gap: 11,
  },
  receiptIconBox: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  receiptIconText: { fontSize: 17 },
  receiptInfo: { flex: 1, minWidth: 0 },
  receiptStore: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 3,
  },
  receiptMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  receiptDate: { fontSize: 11, color: "#bbb" },
  receiptRight: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  receiptAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.2,
  },
  deleteBtn: { paddingVertical: 2, paddingHorizontal: 4 },
  deleteBtnText: { fontSize: 12, color: "#ddd" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    paddingBottom: 44,
  },
  modalHandle: {
    width: 34,
    height: 4,
    backgroundColor: "#D3D1C7",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  modalClose: { padding: 4 },
  modalCloseText: { fontSize: 14, color: "#bbb" },
  modalSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1EFE8",
    borderWidth: 0.5,
    borderColor: "#E8E6DF",
  },
  chipActive: { backgroundColor: "#185FA5", borderColor: "#185FA5" },
  chipText: { fontSize: 13, color: "#555", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  applyBtn: {
    backgroundColor: "#185FA5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
