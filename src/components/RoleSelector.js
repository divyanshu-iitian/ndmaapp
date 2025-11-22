import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RoleSelector = ({ visible, onClose, selectedRole, onSelectRole }) => {
  const roles = [
    { 
      id: 'authority', 
      label: 'Authority', 
      icon: 'shield-checkmark', 
      color: '#2563EB',
      description: 'Centralized platform access'
    },
    { 
      id: 'trainer', 
      label: 'Trainer', 
      icon: 'school', 
      color: '#059669',
      description: 'Conduct and manage trainings'
    },
    { 
      id: 'trainee', 
      label: 'Trainee', 
      icon: 'person', 
      color: '#7C3AED',
      description: 'Attend trainings and get certificates'
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Select Role</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleOption,
                selectedRole === role.id && styles.roleOptionSelected,
              ]}
              onPress={() => {
                onSelectRole(role.id);
                onClose();
              }}
            >
              <View style={[styles.roleIcon, { backgroundColor: `${role.color}20` }]}>
                <Ionicons name={role.icon} size={28} color={role.color} />
              </View>
              
              <View style={styles.roleContent}>
                <Text style={styles.roleLabel}>{role.label}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </View>

              {selectedRole === role.id && (
                <Ionicons name="checkmark-circle" size={24} color={role.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  roleOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleContent: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    color: '#64748B',
  },
});

export default RoleSelector;
