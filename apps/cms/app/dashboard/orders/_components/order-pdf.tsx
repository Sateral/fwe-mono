"use client";

import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type {
  OrderWithRelations,
  OrderSubstitution,
} from "@/lib/types/order-types";

// Styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottom: "2px solid #000",
    paddingBottom: 15,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  orderId: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Courier",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  mealName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 5,
  },
  quantity: {
    fontSize: 16,
    marginBottom: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    color: "#666",
  },
  value: {
    fontSize: 12,
    fontWeight: "bold",
  },
  substitution: {
    backgroundColor: "#E3F2FD",
    padding: 10,
    marginBottom: 5,
    borderRadius: 3,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  substitutionLabel: {
    fontSize: 11,
    color: "#1565C0",
  },
  substitutionValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0D47A1",
  },
  notes: {
    backgroundColor: "#FFF8E1",
    border: "2px solid #FFC107",
    padding: 15,
    marginTop: 10,
    borderRadius: 5,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F57F17",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  notesText: {
    fontSize: 14,
    color: "#333",
  },
  total: {
    borderTop: "2px solid #000",
    paddingTop: 15,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 10,
    color: "#999",
  },
});

// PDF Document Component
function OrderPDFDocument({ order }: { order: OrderWithRelations }) {
  const substitutions =
    (order.substitutions as OrderSubstitution[] | null) || [];

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>KITCHEN ORDER</Text>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          <Text style={styles.timestamp}>
            {new Date(order.createdAt).toLocaleString()}
          </Text>
        </View>

        {/* Meal Info */}
        <View style={styles.section}>
          <Text style={styles.mealName}>{order.meal?.name}</Text>
          <Text style={styles.quantity}>Quantity: {order.quantity}</Text>
        </View>

        {/* Substitutions */}
        {substitutions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Substitutions</Text>
            {substitutions.map((sub, index) => (
              <View key={index} style={styles.substitution}>
                <Text style={styles.substitutionLabel}>{sub.groupName}:</Text>
                <Text style={styles.substitutionValue}>{sub.optionName}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Special Notes */}
        {order.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>⚠️ Special Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Customer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{order.user?.name || "Guest"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{order.user?.email}</Text>
          </View>
        </View>

        {/* Fulfillment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fulfillment</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Method:</Text>
            <Text style={styles.value}>
              {order.deliveryMethod === "PICKUP" ? "Pickup" : "Delivery"}
            </Text>
          </View>
          {order.deliveryMethod === "PICKUP" ? (
            <View style={styles.row}>
              <Text style={styles.label}>Location:</Text>
              <Text style={styles.value}>
                {order.pickupLocation || "Xtreme Couture"}
              </Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>
                {order.user?.deliveryAddress
                  ? `${order.user.deliveryAddress}, ${[
                      order.user.deliveryCity,
                      order.user.deliveryPostal,
                    ]
                      .filter(Boolean)
                      .join(", ")}`
                  : "No address on file"}
              </Text>
            </View>
          )}
        </View>

        {/* Total */}
        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>${order.totalAmount.toFixed(2)}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Free Will Eats - Kitchen Ticket</Text>
      </Page>
    </Document>
  );
}

// Export function to generate and download PDF
export async function generateOrderPDF(order: OrderWithRelations) {
  const blob = await pdf(<OrderPDFDocument order={order} />).toBlob();
  saveAs(blob, `order-${order.id.slice(0, 8)}.pdf`);
}
