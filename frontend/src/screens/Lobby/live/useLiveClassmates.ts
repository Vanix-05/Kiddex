import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getToken } from '../../../session/authToken'
import { API_URL } from '../../../teacher/api/client'
import type { CastMember, LobbyGame, FloorSpot } from '../game/LobbyGame'
import type { Classmate } from '../lobbyData'
import { buddyPicture, kidPicture } from '../useLobbyCast'
import { classmateOf, FINAL_REFUSALS, spotOf, type LivePlayer, type LiveStatus, type LiveWho } from './liveLobby'

/** A classmate in the room, with the pictures that walk around (the Buddy card shows them too). */
export interface LiveClassmate extends Classmate {
  kidUrl: string
  buddyUrl: string
}

interface Known {
  mate: Classmate
  spot: FloorSpot
  /** Drawn and in the room. */
  member: CastMember | null
}

/**
 * Real classmates in the Lobby: the Students of the same section who have the
 * Lobby open right now (Socket.IO). They come in, walk, sit, emote and leave
 * live. The Student's own spot and emotes go to them (sendSpot, sendEmote).
 *
 * `who` null: nobody connects (the dev Lobby). The room opens without waiting
 * for this: Render's free server can take about a minute to wake up, and the
 * classmates simply pop in once it answers.
 */
export function useLiveClassmates(who: LiveWho | null, game: LobbyGame | null) {
  const [classmates, setClassmates] = useState<LiveClassmate[]>([])
  const [status, setStatus] = useState<LiveStatus>(who ? 'connecting' : 'offline')
  const socketRef = useRef<Socket | null>(null)
  const known = useRef(new Map<string, Known>())
  const gameRef = useRef(game)
  const role = who?.role ?? null
  const sectionId = who?.role === 'teacher' ? who.sectionId : null

  /** The React list: everyone drawn and in the room. */
  const publish = useCallback(() => {
    const list: LiveClassmate[] = []
    for (const k of known.current.values()) {
      if (k.member) list.push({ ...k.mate, kidUrl: k.member.kid.url, buddyUrl: k.member.buddy.url })
    }
    setClassmates(list)
  }, [])

  // A new game (the room was rebuilt): put everyone in it again.
  useEffect(() => {
    gameRef.current = game
    if (!game) return
    for (const k of known.current.values()) if (k.member) game.addClassmate(k.member, k.spot)
    // The classmates should see where the Student starts.
    game.resendSpot()
  }, [game])

  useEffect(() => {
    if (!role) return
    const people = known.current
    let alive = true
    // Pictures are drawn one at a time, so the room stays smooth when many come in at once.
    let drawing: Promise<void> = Promise.resolve()

    const add = (player: LivePlayer) => {
      const mate = classmateOf(player)
      if (!mate || people.has(mate.id)) return
      const entry: Known = { mate, spot: spotOf(player), member: null }
      people.set(mate.id, entry)
      drawing = drawing.then(async () => {
        if (!alive || people.get(mate.id) !== entry) return
        try {
          const [kid, buddy] = [await kidPicture(mate.avatar, mate.look), await buddyPicture(mate.buddy, mate.look)]
          if (!alive || people.get(mate.id) !== entry) return
          entry.member = { id: mate.id, name: mate.name, buddyName: mate.buddyName, kid, buddy }
          gameRef.current?.addClassmate(entry.member, entry.spot)
          publish()
        } catch {
          // Their picture couldn't be drawn here: they just don't show.
        }
      })
    }
    const remove = (pid: string) => {
      if (!people.delete(pid)) return
      gameRef.current?.removeClassmate(pid)
      publish()
    }
    const removeAll = () => {
      for (const pid of [...people.keys()]) remove(pid)
    }

    const socket = io(API_URL || undefined, {
      auth: (send) => send(role === 'teacher' ? { token: getToken(), sectionId } : { token: getToken() }),
      reconnectionDelayMax: 10_000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setStatus('live')
      gameRef.current?.resendSpot()
    })
    socket.on('connect_error', (err) => {
      if (FINAL_REFUSALS.includes(err.message)) {
        socket.disconnect()
        setStatus('offline')
      }
    })
    socket.on('disconnect', () => {
      // Who is still here is unknown until it connects again ("everyone" comes then).
      removeAll()
      if (alive && socket.active) setStatus('connecting')
    })
    socket.on('everyone', (players: LivePlayer[]) => {
      if (!Array.isArray(players)) return
      const here = new Set(players.map((p) => p?.pid))
      for (const pid of [...people.keys()]) if (!here.has(pid)) remove(pid)
      for (const p of players) add(p)
    })
    socket.on('join', (player: LivePlayer) => add(player))
    socket.on('leave', (pid: string) => remove(pid))
    socket.on('move', (m: { pid: string; x: number; y: number; seat: number | null }) => {
      const entry = people.get(m?.pid)
      if (!entry || typeof m.x !== 'number' || typeof m.y !== 'number') return
      entry.spot = spotOf(m)
      if (entry.member) gameRef.current?.moveClassmate(m.pid, entry.spot)
    })
    socket.on('emote', (e: { pid: string; emote: number }) => {
      if (people.get(e?.pid)?.member) gameRef.current?.classmateEmote(e.pid, e.emote)
    })
    socket.on('replaced', () => {
      removeAll()
      setStatus('elsewhere')
    })

    return () => {
      alive = false
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      removeAll()
    }
  }, [role, sectionId, publish])

  const sendSpot = useCallback((spot: FloorSpot) => {
    const socket = socketRef.current
    if (socket?.connected) socket.emit('move', spot)
  }, [])
  const sendEmote = useCallback((emote: number) => {
    socketRef.current?.emit('emote', emote)
  }, [])

  return { classmates, status, sendSpot, sendEmote }
}
