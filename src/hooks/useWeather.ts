import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface WeatherData {
  date: string;
  temperature: number;
  weatherCode: number;
  icon: string;
  description: string;
}

interface HourlyWeatherData {
  time: string;
  temperature: number;
  weatherCode: number;
  icon: string;
  description: string;
  precipitation: number;
}

interface WeatherResponse {
  daily: WeatherData[];
  hourly: Record<string, HourlyWeatherData[]>; // Keyed by date
}

// Weather code to description mapping (WMO Weather interpretation codes)
const getWeatherInfo = (code: number): { icon: string; description: string } => {
  if (code === 0) return { icon: "☀️", description: "Clear" };
  if (code <= 3) return { icon: "⛅", description: "Partly Cloudy" };
  if (code <= 48) return { icon: "🌫️", description: "Foggy" };
  if (code <= 67) return { icon: "🌧️", description: "Rainy" };
  if (code <= 77) return { icon: "🌨️", description: "Snow" };
  if (code <= 82) return { icon: "🌧️", description: "Rain Showers" };
  if (code <= 86) return { icon: "🌨️", description: "Snow Showers" };
  return { icon: "⛈️", description: "Thunderstorm" };
};

export const useWeather = (latitude: number = 44.4268, longitude: number = 26.1025) => {
  // Default to Bucharest, Romania coordinates
  
  return useQuery({
    queryKey: ["weather", latitude, longitude],
    queryFn: async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weather_code,precipitation&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe/Bucharest&forecast_days=14`
        );
        
        if (!response.ok) {
          console.error("Weather API error:", response.status, response.statusText);
          throw new Error("Failed to fetch weather");
        }
        
        const data = await response.json();
        console.log("Weather API response:", data);
        
        // Process daily data
        const dailyData: WeatherData[] = data.daily.time.map((date: string, index: number) => {
          const weatherCode = data.daily.weather_code[index];
          const { icon, description } = getWeatherInfo(weatherCode);
          
          return {
            date,
            temperature: Math.round((data.daily.temperature_2m_max[index] + data.daily.temperature_2m_min[index]) / 2),
            weatherCode,
            icon,
            description,
          };
        });
        
        // Process hourly data and group by date
        const hourlyByDate: Record<string, HourlyWeatherData[]> = {};
        
        data.hourly.time.forEach((time: string, index: number) => {
          const date = time.split('T')[0];
          const hour = time.split('T')[1];
          const weatherCode = data.hourly.weather_code[index];
          const { icon, description } = getWeatherInfo(weatherCode);
          
          if (!hourlyByDate[date]) {
            hourlyByDate[date] = [];
          }
          
          hourlyByDate[date].push({
            time: hour,
            temperature: Math.round(data.hourly.temperature_2m[index]),
            weatherCode,
            icon,
            description,
            precipitation: data.hourly.precipitation[index] || 0,
          });
        });
        
        const weatherResponse: WeatherResponse = {
          daily: dailyData,
          hourly: hourlyByDate,
        };
        
        console.log("Processed weather data:", weatherResponse);
        return weatherResponse;
      } catch (error) {
        console.error("Weather fetch error:", error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchInterval: 1000 * 60 * 60, // Refetch every hour
    retry: 2,
    enabled: true, // Explicitly enable the query
  });
};
