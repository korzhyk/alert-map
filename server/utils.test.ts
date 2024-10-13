import { describe, expect, it } from 'bun:test'
import { parseMessage } from './utils'

describe('parseMessage', () => {
  it('regular air alert', () => {
    const [_, alert] = parseMessage(`🔴 22:39 Повітряна тривога в Чернігівська область
    Слідкуйте за подальшими повідомленнями.
    #Чернігівська_область`)
    expect(alert[0]).toBe('Чернігівська область')
  })

  it('artillery alert', () => {
    const [_, alert] = parseMessage(`🔴 19:20 Загроза артобстрілу!
    Зараз у м. Нікополь та Нікопольська територіальна громада артилерійський обстріл.
    Пройдіть в укриття!
    #м_Нікополь_та_Нікопольська_територіальна_громада`)

    expect(alert[0]).toBe('м. Нікополь та Нікопольська територіальна громада')
  })

  it('guided bombs alert', () => {
    const [_, alert] = parseMessage(`🟠 22:49 УВАГА !!! у Пологівський район
    Загроза застосування керованих авіаційних бомб (КАБів).
    #Пологівський_район`)

    expect(alert[0]).toBe('Пологівський район')
  })

  it('clear alert', () => {
    const [clear] = parseMessage(`🟢 00:15 Відбій тривоги в Чернігівська область.
    Слідкуйте за подальшими повідомленнями.
    #Чернігівська_область`)

    expect(clear[0]).toBe('Чернігівська область')
  })

  it('part clear alert', () => {
    const [clear, alert] = parseMessage(`🟡 00:17 УВАГА !!! у Пологівський район.
    Зверніть увагу, тривога ще триває у:
    - Запорізька область
    #Пологівський_район`)

    expect(clear[0]).toBe('Пологівський район')
    expect(alert[0]).toBe('Запорізька область')
  })
})
