"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, Accessibility, Shield, User, Smartphone, Volume2, Download, Palette, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NavBar } from "@/components/nav-bar"
import { TabBar } from "@/components/tab-bar"
import { VoiceMic } from "@/components/voice-mic"
import { ThemeToggle } from "@/components/theme-toggle"
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getUserMe, updateUserMe } from "@/lib/api"

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
  const { isDark } = useTheme()

  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background transition-all duration-300 ease-out",
        checked ? (isDark ? "bg-yellow-400 focus:ring-yellow-400" : "bg-blue-600 focus:ring-blue-600") : "bg-muted",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  )
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ name: string } | null>(null)
  const [settings, setSettings] = useState({
    notifications: true,
    soundAlerts: true,
    voiceReminders: true,
    reducedMotion: false,
    caregiverAlerts: true,
    biometricAuth: false,
    dataSharing: false,
    installPrompt: true,
  })

  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark, toggleTheme } = useTheme()
  const { toast } = useToast()

  useEffect(() => {
    getUserMe().then((u) => setProfile({ name: u.name }))
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const updateSetting = (key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))

    // Handle specific setting changes
    if (key === "reducedMotion") {
      // This would typically update a global context or localStorage
      toast({
        title: "Motion preferences updated",
        description: value ? "Animations have been reduced" : "Full animations enabled",
      })
    }
  }

  const handleInstallApp = async () => {
    if (!installPrompt) return

    const result = await installPrompt.prompt()
    if (result.outcome === "accepted") {
      setIsInstalled(true)
      setInstallPrompt(null)
      toast({
        title: "App installed successfully",
        description: "MedTime is now available on your home screen",
      })
    }
  }

  const testNotificationSound = () => {
    // Play a test notification sound
    const audio = new Audio("/notification-sound.mp3")
    audio.play().catch(() => {
      toast({
        title: "Sound test",
        description: "Notification sound would play here",
      })
    })
  }

  const settingSections = [
    {
      id: "appearance",
      title: "Appearance",
      icon: Palette,
      color: isDark ? "text-purple-400" : "text-purple-600",
      bgColor: isDark ? "bg-purple-500/10" : "bg-purple-100",
      settings: [
        {
          key: "darkMode",
          title: "Theme",
          description: "Switch between light and dark themes",
          customControl: (
            <div className="flex items-center space-x-2">
              <Sun className="w-4 h-4 text-muted-foreground" />
              <ThemeToggle size="sm" />
              <Moon className="w-4 h-4 text-muted-foreground" />
            </div>
          ),
        },
      ],
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: Bell,
      color: isDark ? "text-blue-400" : "text-blue-600",
      bgColor: isDark ? "bg-blue-500/10" : "bg-blue-100",
      settings: [
        {
          key: "notifications",
          title: "Push Notifications",
          description: "Receive alerts for medication reminders and updates",
        },
        {
          key: "soundAlerts",
          title: "Sound Alerts",
          description: "Play notification sounds for medication reminders",
        },
        {
          key: "voiceReminders",
          title: "Voice Reminders",
          description: "Enable voice-based medication reminders and confirmations",
        },
      ],
    },
    {
      id: "accessibility",
      title: "Accessibility",
      icon: Accessibility,
      color: isDark ? "text-green-400" : "text-green-600",
      bgColor: isDark ? "bg-green-500/10" : "bg-green-100",
      settings: [
        {
          key: "reducedMotion",
          title: "Reduced Motion",
          description: "Minimize animations and transitions for better accessibility",
        },
      ],
    },
    {
      id: "privacy",
      title: "Privacy & Security",
      icon: Shield,
      color: isDark ? "text-red-400" : "text-red-600",
      bgColor: isDark ? "bg-red-500/10" : "bg-red-100",
      settings: [
        {
          key: "caregiverAlerts",
          title: "Caregiver Notifications",
          description: "Allow designated caregivers to receive your medication alerts",
        },
        {
          key: "biometricAuth",
          title: "Biometric Authentication",
          description: "Use fingerprint or face recognition to secure the app",
        },
        {
          key: "dataSharing",
          title: "Anonymous Data Sharing",
          description: "Help improve the app by sharing anonymous usage data",
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="Settings" showThemeToggle />

      <main className="px-4 py-6 pb-20">
        <motion.div
          className="max-w-2xl mx-auto space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durations.md / 1000, ease: easing.enter }}
        >
          {/* Header */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.sm / 1000, ease: easing.enter }}
          >
            <h1 className="font-heading text-2xl font-bold text-foreground text-balance">Settings</h1>
            <p className="text-muted-foreground text-pretty">Customize your medication management experience</p>
          </motion.div>

          {/* PWA Install Banner */}
          <AnimatePresence>
            {installPrompt && !isInstalled && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: durations.md / 1000, ease: easing.enter }}
              >
                <Card
                  className={cn(
                    "p-4 border-l-4 transition-all duration-300 ease-out",
                    isDark
                      ? "border-l-yellow-400 bg-gradient-to-r from-yellow-400/5 to-transparent"
                      : "border-l-blue-600 bg-gradient-to-r from-blue-600/5 to-transparent",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Download className={cn("w-5 h-5", isDark ? "text-yellow-400" : "text-blue-600")} />
                      <div>
                        <p className="font-medium text-foreground">Install MedTime</p>
                        <p className="text-sm text-muted-foreground">Add to your home screen for quick access</p>
                      </div>
                    </div>
                    <Button onClick={handleInstallApp} size="sm" className="btn-premium">
                      Install
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.sm / 1000, ease: easing.enter, delay: 0.1 }}
          >
            <Card className="p-6 glass-card transition-all duration-300 ease-out">
              <div className="flex items-center space-x-4">
                <div
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center",
                    isDark ? "bg-yellow-400/10" : "bg-blue-100",
                  )}
                >
                  <User className={cn("w-8 h-8", isDark ? "text-yellow-400" : "text-blue-600")} />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-lg font-semibold text-foreground">{profile?.name || "Unknown User"}</h3>
                  <p className="text-sm text-muted-foreground">&nbsp;</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {isInstalled && (
                      <Badge variant="success" className="text-xs">
                        App Installed
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="btn-premium bg-transparent"
                  onClick={async () => {
                    const newName = prompt("Update your display name", profile?.name || "")
                    if (newName && newName.trim()) {
                      try {
                        const u = await updateUserMe({ name: newName.trim() })
                        setProfile({ name: u.name })
                        window.location.reload()
                      } catch (e: any) {
                        alert(e?.message || "Failed to update name")
                      }
                    }
                  }}
                >
                  Edit Profile
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Settings sections */}
          <motion.div
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: prefersReducedMotion ? 0 : 0.1,
                  delayChildren: 0.2,
                },
              },
            }}
          >
            {settingSections.map((section) => {
              const Icon = section.icon

              return (
                <motion.div
                  key={section.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: durations.sm / 1000,
                        ease: easing.enter,
                      },
                    },
                  }}
                >
                  <Card className="p-6 glass-card transition-all duration-300 ease-out">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", section.bgColor)}>
                        <Icon className={cn("w-5 h-5", section.color)} />
                      </div>
                      <h2 className="font-heading text-lg font-semibold text-foreground">{section.title}</h2>
                    </div>

                    <div className="space-y-6">
                      {section.settings.map((setting) => (
                        <div key={setting.key} className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                            <p className="font-medium text-foreground">{setting.title}</p>
                            <p className="text-sm text-muted-foreground mt-1 text-pretty">{setting.description}</p>
                          </div>
                          {setting.customControl || (
                            <ToggleSwitch
                              checked={settings[setting.key as keyof typeof settings]}
                              onChange={(checked) => updateSetting(setting.key, checked)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Device info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.sm / 1000, ease: easing.enter, delay: 0.5 }}
          >
            <Card className="p-6 glass-card transition-all duration-300 ease-out">
              <div className="flex items-center space-x-3 mb-4">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isDark ? "bg-purple-500/10" : "bg-purple-100",
                  )}
                >
                  <Smartphone className={cn("w-5 h-5", isDark ? "text-purple-400" : "text-purple-600")} />
                </div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Device Information</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">App Version</span>
                  <span className="text-foreground font-medium">1.1.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Theme</span>
                  <span className="text-foreground font-medium capitalize">{isDark ? "Dark" : "Light"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span className="text-foreground font-medium">2 minutes ago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage Used</span>
                  <span className="text-foreground font-medium">12.4 MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PWA Status</span>
                  <Badge variant={isInstalled ? "success" : "secondary"} className="text-xs">
                    {isInstalled ? "Installed" : "Web App"}
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.sm / 1000, ease: easing.enter, delay: 0.6 }}
          >
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent btn-premium"
              onClick={testNotificationSound}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Test Notification Sound
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent btn-premium">
              Export Data
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent btn-premium">
              Contact Support
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start btn-premium"
              onClick={() => {
                window.location.href = "/api/auth/logout"
              }}
            >
              Sign Out
            </Button>
          </motion.div>
        </motion.div>
      </main>

      <TabBar />
      <VoiceMic />
    </div>
  )
}
