import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@app/theme/colors";

interface ModuleCardProps {
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  onPress,
  disabled
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        pressed && !disabled && styles.cardPressed,
        disabled && styles.cardDisabled
      ]}
    >
      <View style={styles.leftStripe} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text
          style={[
            styles.description,
            disabled && styles.descriptionDisabled
          ]}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden"
  },
  cardPressed: {
    borderColor: colors.accent,
    transform: [{ scale: 0.98 }]
  },
  cardDisabled: {
    opacity: 0.6
  },
  leftStripe: {
    width: 4,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    marginRight: 12
  },
  content: {
    flex: 1
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary
  },
  descriptionDisabled: {
    color: colors.textMuted
  }
});

export default ModuleCard;
