import * as Brightness from 'expo-brightness';

/**
 * Gets the system brightness (Android only).
 * Returns a number between 0 (dark) and 1 (bright) or null if an error occurs.
 */
export async function getSystemBrightness(): Promise<number | null> {
    try {
        const brightness = await Brightness.getSystemBrightnessAsync();
        return brightness;
    } catch (error) {
        console.error('Error getting system brightness:', error);
        return null;
    }
}

/**
 * Sets the system brightness (Android only).
 * Note: Setting system brightness may require additional permissions.
 * @param brightness A number between 0 and 1.
 */
export async function setSystemBrightness(brightness: number): Promise<void> {
    const { status } = await Brightness.requestPermissionsAsync();
    if (status === 'granted') {
        try {
            await Brightness.setSystemBrightnessAsync(brightness);
        } catch (error) {
            console.error('Error setting system brightness:', error);
        }
    }
}