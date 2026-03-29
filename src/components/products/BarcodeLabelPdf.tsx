import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image as PdfImage,
} from "@react-pdf/renderer";

const MM_TO_PT = 2.835;

interface BarcodeLabelPdfProps {
  product: { name: string; sku: string | null };
  barcodeDataUrl: string;
  labelWidthMm: number;
  labelHeightMm: number;
}

const BarcodeLabelPdf: React.FC<BarcodeLabelPdfProps> = ({
  product,
  barcodeDataUrl,
  labelWidthMm,
  labelHeightMm,
}) => {
  const widthPt = labelWidthMm * MM_TO_PT;
  const heightPt = labelHeightMm * MM_TO_PT;
  const paddingPt = 4;

  const styles = StyleSheet.create({
    page: {
      padding: paddingPt,
      fontFamily: "Amiri",
      backgroundColor: "#ffffff",
    },
    container: {
      flex: 1,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    barcodeImage: {
      width: widthPt - paddingPt * 2,
      height: (heightPt - paddingPt * 2) * 0.6,
      objectFit: "contain",
    },
    productName: {
      fontSize: 6.5,
      textAlign: "center",
      marginTop: 2,
      color: "#000000",
    },
    skuText: {
      fontSize: 5,
      textAlign: "center",
      marginTop: 1,
      color: "#555555",
    },
  });

  return (
    <Document>
      <Page size={[widthPt, heightPt]} style={styles.page}>
        <View style={styles.container}>
          <PdfImage src={barcodeDataUrl} style={styles.barcodeImage} />
          <Text style={styles.productName}>{product.name}</Text>
          {product.sku && (
            <Text style={styles.skuText}>{product.sku}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

export default BarcodeLabelPdf;
