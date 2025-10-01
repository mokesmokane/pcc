import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

export type CountryCode = {
  name: string;
  dial_code: string;
  code: string;
  flag: string;
};

const COUNTRY_CODES: CountryCode[] = [
  { name: 'United Kingdom', dial_code: '+44', code: 'GB', flag: '🇬🇧' },
  { name: 'United States', dial_code: '+1', code: 'US', flag: '🇺🇸' },
  { name: 'Ireland', dial_code: '+353', code: 'IE', flag: '🇮🇪' },
  { name: 'Canada', dial_code: '+1', code: 'CA', flag: '🇨🇦' },
  { name: 'Australia', dial_code: '+61', code: 'AU', flag: '🇦🇺' },
  { name: 'New Zealand', dial_code: '+64', code: 'NZ', flag: '🇳🇿' },
  { name: 'France', dial_code: '+33', code: 'FR', flag: '🇫🇷' },
  { name: 'Germany', dial_code: '+49', code: 'DE', flag: '🇩🇪' },
  { name: 'Spain', dial_code: '+34', code: 'ES', flag: '🇪🇸' },
  { name: 'Italy', dial_code: '+39', code: 'IT', flag: '🇮🇹' },
  { name: 'Netherlands', dial_code: '+31', code: 'NL', flag: '🇳🇱' },
  { name: 'Belgium', dial_code: '+32', code: 'BE', flag: '🇧🇪' },
  { name: 'Switzerland', dial_code: '+41', code: 'CH', flag: '🇨🇭' },
  { name: 'Sweden', dial_code: '+46', code: 'SE', flag: '🇸🇪' },
  { name: 'Norway', dial_code: '+47', code: 'NO', flag: '🇳🇴' },
  { name: 'Denmark', dial_code: '+45', code: 'DK', flag: '🇩🇰' },
  { name: 'India', dial_code: '+91', code: 'IN', flag: '🇮🇳' },
  { name: 'Japan', dial_code: '+81', code: 'JP', flag: '🇯🇵' },
  { name: 'South Africa', dial_code: '+27', code: 'ZA', flag: '🇿🇦' },
  { name: 'Brazil', dial_code: '+55', code: 'BR', flag: '🇧🇷' },
];

interface CountryCodeSelectorProps {
  selectedCountry: CountryCode;
  onSelectCountry: (country: CountryCode) => void;
}

export default function CountryCodeSelector({
  selectedCountry,
  onSelectCountry,
}: CountryCodeSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredCountries = COUNTRY_CODES.filter(country =>
    country.name.toLowerCase().includes(searchText.toLowerCase()) ||
    country.dial_code.includes(searchText)
  );

  const handleSelectCountry = (country: CountryCode) => {
    onSelectCountry(country);
    setModalVisible(false);
    setSearchText('');
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.selectorText}>
          {selectedCountry.flag} {selectedCountry.dial_code}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSearchText('');
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchText('');
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code"
              placeholderTextColor="#8B8680"
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
            />

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    item.code === selectedCountry.code && styles.selectedCountryItem
                  ]}
                  onPress={() => handleSelectCountry(item)}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryCode}>{item.dial_code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#403837',
    borderRadius: 12,
    backgroundColor: 'transparent',
    minWidth: 100,
  },
  selectorText: {
    fontSize: 16,
    color: '#403837',
  },
  arrow: {
    fontSize: 10,
    color: '#8B8680',
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#F4F1ED',
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#403837',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#8B8680',
  },
  searchInput: {
    margin: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#403837',
    borderRadius: 10,
    fontSize: 16,
    color: '#403837',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedCountryItem: {
    backgroundColor: '#F0CFC5',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 15,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#403837',
  },
  countryCode: {
    fontSize: 16,
    color: '#8B8680',
  },
});

export { COUNTRY_CODES };