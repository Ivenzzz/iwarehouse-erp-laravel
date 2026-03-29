export function getInitials(name, username) {
    const source = name || username || 'IU';

    return source
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}
