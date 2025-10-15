import { describe, it, expect, beforeEach } from 'vitest'
import { useSchedulingStore } from '../store/useSchedulingStore'

describe('useSchedulingStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSchedulingStore.getState().reset()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useSchedulingStore.getState()
      
      expect(state.config).toBeDefined()
      expect(state.config.businessHours).toBeDefined()
      expect(state.config.roles).toEqual([])
      expect(state.config.employees).toEqual([])
      expect(state.config.hardRules).toBeDefined()
      expect(state.config.softRules).toBeDefined()
    })
  })

  describe('business hours management', () => {
    it('should set business hours for a day', () => {
      const { setBusinessHours } = useSchedulingStore.getState()
      
      setBusinessHours('monday', {
        startTime: '09:00',
        endTime: '17:00',
        isOpen: true
      })
      
      const state = useSchedulingStore.getState()
      expect(state.config.businessHours.monday.startTime).toBe('09:00')
      expect(state.config.businessHours.monday.endTime).toBe('17:00')
      expect(state.config.businessHours.monday.isOpen).toBe(true)
    })

    it('should handle 24-hour business hours', () => {
      const { setBusinessHours } = useSchedulingStore.getState()
      
      setBusinessHours('sunday', {
        startTime: '00:00',
        endTime: '23:59',
        isOpen: true,
        is24Hours: true
      })
      
      const state = useSchedulingStore.getState()
      expect(state.config.businessHours.sunday.is24Hours).toBe(true)
    })
  })

  describe('role management', () => {
    it('should add a new role', () => {
      const { addRole } = useSchedulingStore.getState()
      
      const newRole = {
        name: 'Server',
        color: '#3B82F6',
        coverageIntervals: []
      }
      
      addRole(newRole)
      
      const state = useSchedulingStore.getState()
      expect(state.config.roles).toHaveLength(1)
      expect(state.config.roles[0].name).toBe('Server')
      expect(state.config.roles[0].color).toBe('#3B82F6')
    })

    it('should remove a role', () => {
      const { addRole, removeRole } = useSchedulingStore.getState()
      
      const newRole = {
        name: 'Server',
        color: '#3B82F6',
        coverageIntervals: []
      }
      
      addRole(newRole)
      const roleId = useSchedulingStore.getState().config.roles[0].id
      
      removeRole(roleId)
      
      const state = useSchedulingStore.getState()
      expect(state.config.roles).toHaveLength(0)
    })
  })

  describe('employee management', () => {
    it('should add a new employee', () => {
      const { addEmployee } = useSchedulingStore.getState()
      
      const newEmployee = {
        name: 'John Doe',
        email: 'john@example.com',
        roles: [],
        hourlyRate: 15,
        maxHoursPerWeek: 40,
        minHoursPerWeek: 0,
        availability: {},
        preferences: {
          preferredShifts: [],
          avoidShifts: [],
          maxConsecutiveDays: 5,
          minRestBetweenShifts: 12
        }
      }
      
      addEmployee(newEmployee)
      
      const state = useSchedulingStore.getState()
      expect(state.config.employees).toHaveLength(1)
      expect(state.config.employees[0].name).toBe('John Doe')
      expect(state.config.employees[0].email).toBe('john@example.com')
    })
  })

  describe('rules management', () => {
    it('should update hard rules', () => {
      const { setHardRules } = useSchedulingStore.getState()
      
      const newHardRules = {
        maxHoursPerWeek: { enabled: true, value: 40 },
        enforceMinimumCoverage: true,
        complyWithLaborLaws: true
      }
      
      setHardRules(newHardRules)
      
      const state = useSchedulingStore.getState()
      expect(state.config.hardRules.maxHoursPerWeek.enabled).toBe(true)
      expect(state.config.hardRules.maxHoursPerWeek.value).toBe(40)
      expect(state.config.hardRules.enforceMinimumCoverage).toBe(true)
    })

    it('should update soft rules', () => {
      const { setSoftRules } = useSchedulingStore.getState()
      
      const newSoftRules = {
        hoursBalance: 75,
        weekendBalance: 60,
        respectPreferences: 80
      }
      
      setSoftRules(newSoftRules)
      
      const state = useSchedulingStore.getState()
      expect(state.config.softRules.hoursBalance).toBe(75)
      expect(state.config.softRules.weekendBalance).toBe(60)
      expect(state.config.softRules.respectPreferences).toBe(80)
    })
  })

  describe('validation', () => {
    it('should detect conflicts in business hours', () => {
      const { setBusinessHours, conflicts } = useSchedulingStore.getState()
      
      // Set overlapping business hours
      setBusinessHours('monday', {
        startTime: '09:00',
        endTime: '17:00',
        isOpen: true
      })
      
      setBusinessHours('monday', {
        startTime: '16:00',
        endTime: '20:00',
        isOpen: true
      })
      
      const state = useSchedulingStore.getState()
      expect(state.conflicts.length).toBeGreaterThan(0)
    })
  })

  describe('export/import', () => {
    it('should export configuration', () => {
      const { exportConfig } = useSchedulingStore.getState()
      
      const exported = exportConfig()
      
      expect(typeof exported).toBe('string')
      expect(() => JSON.parse(exported)).not.toThrow()
    })

    it('should import configuration', () => {
      const { exportConfig, importConfig, reset } = useSchedulingStore.getState()
      
      // Set some data
      reset()
      const { addRole } = useSchedulingStore.getState()
      addRole({ name: 'Test Role', color: '#FF0000', coverageIntervals: [] })
      
      const exported = exportConfig()
      reset()
      
      const success = importConfig(exported)
      expect(success).toBe(true)
      
      const state = useSchedulingStore.getState()
      expect(state.config.roles).toHaveLength(1)
      expect(state.config.roles[0].name).toBe('Test Role')
    })
  })
})
