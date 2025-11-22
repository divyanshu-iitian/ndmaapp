import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const OrganizationPicker = ({ value, onChange, label = "Organization" }) => {
  const organizations = [
    { label: 'NDMA (National Disaster Management Authority)', value: 'NDMA' },
    { label: 'SDMA (State Disaster Management Authority)', value: 'SDMA' },
    { label: 'DDMA (District Disaster Management Authority)', value: 'DDMA' },
    { label: 'Fire Services', value: 'Fire Services' },
    { label: 'Police Department', value: 'Police' },
    { label: 'Health Department', value: 'Health' },
    { label: 'Other', value: 'Other' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={value}
          onValueChange={onChange}
          style={styles.picker}
        >
          {organizations.map((org) => (
            <Picker.Item 
              key={org.value} 
              label={org.label} 
              value={org.value} 
            />
          ))}
        </Picker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  pickerWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#1E293B',
  },
});

export default OrganizationPicker;
