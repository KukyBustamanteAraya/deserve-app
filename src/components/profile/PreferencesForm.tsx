'use client';

import { useState } from 'react';
import { UserPreferences, NotificationPreferences, Language, Theme, EmailFrequency } from '@/types/profile';

interface PreferencesFormProps {
  initialData: UserPreferences;
  onSave: (data: Partial<UserPreferences>) => Promise<void>;
  disabled?: boolean;
}

export default function PreferencesForm({ initialData, onSave, disabled = false }: PreferencesFormProps) {
  const [formData, setFormData] = useState<UserPreferences>({
    notifications: {
      email: initialData.notifications?.email ?? true,
      push: initialData.notifications?.push ?? false,
      sms: initialData.notifications?.sms ?? false,
      order_updates: initialData.notifications?.order_updates ?? true,
      design_updates: initialData.notifications?.design_updates ?? true,
      team_updates: initialData.notifications?.team_updates ?? true,
    },
    language: initialData.language || 'es',
    theme: initialData.theme || 'auto',
    email_frequency: initialData.email_frequency || 'instant',
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || loading) return;

    setLoading(true);
    setSaved(false);

    try {
      await onSave(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = (key: keyof NotificationPreferences) => {
    setFormData({
      ...formData,
      notifications: {
        ...formData.notifications,
        [key]: !formData.notifications?.[key],
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Preferencias
        </h3>
        <p className="text-sm text-gray-300 mb-6">
          Personaliza tu experiencia en la plataforma
        </p>
      </div>

      {/* Language */}
      <div>
        <label htmlFor="language" className="block text-sm font-medium text-white mb-2">
          Idioma
        </label>
        <select
          id="language"
          value={formData.language}
          onChange={(e) => setFormData({ ...formData, language: e.target.value as Language })}
          disabled={disabled}
          className="relative w-full max-w-xs px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Tema
        </label>
        <div className="grid grid-cols-3 gap-3 max-w-md">
          {(['light', 'dark', 'auto'] as Theme[]).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => setFormData({ ...formData, theme })}
              disabled={disabled}
              className={`
                relative py-3 px-4 rounded-md border-2 transition-all text-sm font-medium overflow-hidden group
                ${formData.theme === theme
                  ? 'border-[#e21c21] bg-gradient-to-br from-[#e21c21]/20 via-[#c11a1e]/10 to-[#a01519]/20 text-white ring-2 ring-[#e21c21]/30'
                  : 'border-gray-700 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 text-gray-300 hover:border-[#e21c21]/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">
                {theme === 'light' && '☀️ Claro'}
                {theme === 'dark' && '🌙 Oscuro'}
                {theme === 'auto' && '⚙️ Auto'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notification Channels */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Canales de Notificación
        </label>
        <div className="space-y-3">
          <label className="relative flex items-center gap-3 p-3 border border-gray-700 rounded-md bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 hover:border-[#e21c21]/50 cursor-pointer overflow-hidden group transition-all">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <input
              type="checkbox"
              checked={formData.notifications?.email ?? true}
              onChange={() => handleNotificationToggle('email')}
              disabled={disabled}
              className="relative w-4 h-4 text-[#e21c21] bg-gray-700 border-gray-600 rounded focus:ring-[#e21c21]/50 focus:ring-2 disabled:opacity-50"
            />
            <div className="flex-1 relative">
              <div className="font-medium text-sm text-white">Email</div>
              <div className="text-xs text-gray-400">Recibir notificaciones por correo electrónico</div>
            </div>
          </label>

          <label className="relative flex items-center gap-3 p-3 border border-gray-700 rounded-md bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 hover:border-[#e21c21]/50 cursor-pointer overflow-hidden group transition-all">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <input
              type="checkbox"
              checked={formData.notifications?.push ?? false}
              onChange={() => handleNotificationToggle('push')}
              disabled={disabled}
              className="relative w-4 h-4 text-[#e21c21] bg-gray-700 border-gray-600 rounded focus:ring-[#e21c21]/50 focus:ring-2 disabled:opacity-50"
            />
            <div className="flex-1 relative">
              <div className="font-medium text-sm text-white">Push</div>
              <div className="text-xs text-gray-400">Notificaciones push del navegador</div>
            </div>
          </label>

          <label className="relative flex items-center gap-3 p-3 border border-gray-700 rounded-md bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 hover:border-[#e21c21]/50 cursor-pointer overflow-hidden group transition-all">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <input
              type="checkbox"
              checked={formData.notifications?.sms ?? false}
              onChange={() => handleNotificationToggle('sms')}
              disabled={disabled}
              className="relative w-4 h-4 text-[#e21c21] bg-gray-700 border-gray-600 rounded focus:ring-[#e21c21]/50 focus:ring-2 disabled:opacity-50"
            />
            <div className="flex-1 relative">
              <div className="font-medium text-sm text-white">SMS</div>
              <div className="text-xs text-gray-400">Mensajes de texto (solo para actualizaciones críticas)</div>
            </div>
          </label>
        </div>
      </div>

      {/* Notification Types */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Tipos de Notificaciones
        </label>
        <div className="space-y-3">
          <label className="relative flex items-center gap-3 p-3 border border-gray-700 rounded-md bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 hover:border-[#e21c21]/50 cursor-pointer overflow-hidden group transition-all">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <input
              type="checkbox"
              checked={formData.notifications?.order_updates ?? true}
              onChange={() => handleNotificationToggle('order_updates')}
              disabled={disabled}
              className="relative w-4 h-4 text-[#e21c21] bg-gray-700 border-gray-600 rounded focus:ring-[#e21c21]/50 focus:ring-2 disabled:opacity-50"
            />
            <div className="flex-1 relative">
              <div className="font-medium text-sm text-white">Actualizaciones de Pedidos</div>
              <div className="text-xs text-gray-400">Estados de pedido, envíos y entregas</div>
            </div>
          </label>

          <label className="relative flex items-center gap-3 p-3 border border-gray-700 rounded-md bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 hover:border-[#e21c21]/50 cursor-pointer overflow-hidden group transition-all">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <input
              type="checkbox"
              checked={formData.notifications?.design_updates ?? true}
              onChange={() => handleNotificationToggle('design_updates')}
              disabled={disabled}
              className="relative w-4 h-4 text-[#e21c21] bg-gray-700 border-gray-600 rounded focus:ring-[#e21c21]/50 focus:ring-2 disabled:opacity-50"
            />
            <div className="flex-1 relative">
              <div className="font-medium text-sm text-white">Actualizaciones de Diseño</div>
              <div className="text-xs text-gray-400">Mockups, aprobaciones y cambios de diseño</div>
            </div>
          </label>

          <label className="relative flex items-center gap-3 p-3 border border-gray-700 rounded-md bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 hover:border-[#e21c21]/50 cursor-pointer overflow-hidden group transition-all">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <input
              type="checkbox"
              checked={formData.notifications?.team_updates ?? true}
              onChange={() => handleNotificationToggle('team_updates')}
              disabled={disabled}
              className="relative w-4 h-4 text-[#e21c21] bg-gray-700 border-gray-600 rounded focus:ring-[#e21c21]/50 focus:ring-2 disabled:opacity-50"
            />
            <div className="flex-1 relative">
              <div className="font-medium text-sm text-white">Actualizaciones de Equipo</div>
              <div className="text-xs text-gray-400">Invitaciones, cambios de miembros y eventos</div>
            </div>
          </label>
        </div>
      </div>

      {/* Email Frequency */}
      <div>
        <label htmlFor="email-frequency" className="block text-sm font-medium text-white mb-2">
          Frecuencia de Emails
        </label>
        <select
          id="email-frequency"
          value={formData.email_frequency}
          onChange={(e) => setFormData({ ...formData, email_frequency: e.target.value as EmailFrequency })}
          disabled={disabled}
          className="relative w-full max-w-xs px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50"
        >
          <option value="instant">Instantáneo</option>
          <option value="daily">Resumen Diario</option>
          <option value="weekly">Resumen Semanal</option>
          <option value="never">Nunca</option>
        </select>
        <p className="mt-1 text-sm text-gray-400">
          {formData.email_frequency === 'instant' && 'Recibirás emails inmediatamente cuando ocurran eventos'}
          {formData.email_frequency === 'daily' && 'Recibirás un resumen diario de todas las notificaciones'}
          {formData.email_frequency === 'weekly' && 'Recibirás un resumen semanal de todas las notificaciones'}
          {formData.email_frequency === 'never' && 'No recibirás emails de notificaciones'}
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <div>
          {saved && (
            <span className="text-sm text-green-400 flex items-center">
              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Guardado correctamente
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled || loading}
          className="relative px-6 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white rounded-md font-medium hover:shadow-lg hover:shadow-[#e21c21]/30 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Guardando...' : 'Guardar Preferencias'}
        </button>
      </div>
    </form>
  );
}
