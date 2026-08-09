import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	eventToChord,
	keybindings,
	loadKeybindings,
	matchKeybinding,
	resetKeybindings,
	Shortcut
} from './shortcuts';

const key = (
	key: string,
	modifiers: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>> = {}
) =>
	({
		key,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		shiftKey: false,
		...modifiers
	}) as KeyboardEvent;

describe('shortcuts', () => {
	beforeEach(() => {
		resetKeybindings();
	});

	it('normalizes ctrl to Cmd on non-Mac platforms', () => {
		expect(eventToChord(key('k', { ctrlKey: true }))).toBe('Cmd+K');
		expect(matchKeybinding(key('k', { ctrlKey: true }))).toBe(Shortcut.SEARCH);
	});

	it('loads saved bindings, including unassigned shortcuts', () => {
		loadKeybindings({
			[Shortcut.SEARCH]: 'Cmd+Shift+P',
			[Shortcut.NEW_CHAT]: ''
		});

		expect(matchKeybinding(key('k', { ctrlKey: true }))).toBeNull();
		expect(matchKeybinding(key('p', { ctrlKey: true, shiftKey: true }))).toBe(Shortcut.SEARCH);
		expect(matchKeybinding(key('o', { ctrlKey: true, shiftKey: true }))).toBeNull();
	});

	it('never matches browser-reserved reload chords', () => {
		// REGENERATE_RESPONSE is unassigned by default in this fork, but even
		// if a saved/loaded binding claims Cmd+R, the app must not match it.
		loadKeybindings({
			[Shortcut.REGENERATE_RESPONSE]: 'Cmd+R'
		});

		expect(matchKeybinding(key('r', { metaKey: true }))).toBeNull();
		expect(matchKeybinding(key('r', { metaKey: true, shiftKey: true }))).toBeNull();
		expect(matchKeybinding(key('r', { ctrlKey: true }))).toBeNull();
		expect(matchKeybinding(key('r', { ctrlKey: true, shiftKey: true }))).toBeNull();
	});

	it('loadKeybindings strips saved browser-reserved chords', () => {
		loadKeybindings({
			[Shortcut.REGENERATE_RESPONSE]: 'Cmd+Shift+R',
			[Shortcut.SEARCH]: 'Cmd+R'
		});

		expect(get(keybindings)[Shortcut.REGENERATE_RESPONSE]).toBe('');
		expect(get(keybindings)[Shortcut.SEARCH]).toBe('');
	});
});
