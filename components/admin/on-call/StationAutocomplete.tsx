'use client';
import { Combobox } from '@headlessui/react';
import { memo, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useUsersByRole } from '@/lib/hooks/useUsersByRole';
import type { ResidentProfile } from '@/types/auth';
import type { StationAssignment } from '@/types/onCall';

interface StationAutocompleteProps {
  value: StationAssignment | null;
  onChange: (value: StationAssignment | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const StationAutocomplete = memo(function StationAutocomplete({
  value,
  onChange,
  placeholder,
  disabled = false,
}: StationAutocompleteProps) {
  const { t } = useTranslation();
  const { residents, loading } = useUsersByRole();
  const [query, setQuery] = useState('');

  // Filter residents based on search query
  const filteredResidents = useMemo(() => {
    if (!query) return residents;

    const lowerQuery = query.toLowerCase();
    return residents.filter((resident) =>
      resident.fullName?.toLowerCase().includes(lowerQuery) ||
      resident.email?.toLowerCase().includes(lowerQuery)
    );
  }, [residents, query]);

  // Convert ResidentProfile to StationAssignment
  const handleChange = (resident: ResidentProfile | null) => {
    if (!resident) {
      onChange(null);
      return;
    }

    onChange({
      userId: resident.uid,
      userDisplayName: resident.fullName || resident.email || 'Unknown',
    });
  };

  // Find selected resident from value
  const selectedResident = useMemo<ResidentProfile | null>(() => {
    if (!value) return null;
    return (residents.find((r) => r.uid === value.userId) as ResidentProfile) || null;
  }, [value, residents]);

  if (loading) {
    return (
      <div className="relative">
        <input
          type="text"
          disabled
          placeholder={t('ui.loading', { defaultValue: 'Loading...' })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-400"
        />
      </div>
    );
  }

  return (
    <Combobox<ResidentProfile | null> value={selectedResident} onChange={handleChange} disabled={disabled}>
      <div className="relative">
        <Combobox.Input
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
          displayValue={(resident: ResidentProfile | null) =>
            resident?.fullName || resident?.email || ''
          }
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder || t('onCall.selectResident', { defaultValue: 'Select resident...' })}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        )}

        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
          <span className="text-gray-400">▼</span>
        </Combobox.Button>

        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {filteredResidents.length === 0 && query !== '' ? (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-500 dark:text-gray-400">
              {t('ui.noResults', { defaultValue: 'No results found' })}
            </div>
          ) : (
            filteredResidents.map((resident) => (
              <Combobox.Option
                key={resident.uid}
                value={resident}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-900 dark:text-gray-100'
                  }`
                }
              >
                {({ selected, active }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {resident.fullName}
                    </span>
                    {selected && (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? 'text-white' : 'text-blue-600'
                        }`}
                      >
                        ✓
                      </span>
                    )}
                    <span className={`block text-xs truncate ${active ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {resident.email}
                    </span>
                  </>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  );
});

export default StationAutocomplete;
