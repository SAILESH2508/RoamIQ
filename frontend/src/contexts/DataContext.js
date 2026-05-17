import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from '../api/axios';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [trips, setTrips] = useState(() => {
    const cached = localStorage.getItem('roamiq_cached_trips');
    return cached ? JSON.parse(cached) : [];
  });
  const [stats, setStats] = useState(() => {
    const cached = localStorage.getItem('roamiq_cached_stats');
    return cached ? JSON.parse(cached) : {
      totalTrips: 0,
      upcomingTrips: 0,
      totalBudget: 0,
      completedTrips: 0
    };
  });
  const [recentActivities, setRecentActivities] = useState(() => {
    const cached = localStorage.getItem('roamiq_cached_activities');
    return cached ? JSON.parse(cached) : [];
  });
  const [achievements, setAchievements] = useState(() => {
    const cached = localStorage.getItem('roamiq_cached_achievements');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(() => {
    const cached = localStorage.getItem('roamiq_last_fetch');
    return cached ? parseInt(cached) : null;
  });

  const fetchTrips = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // If we have cached data and not forcing refresh, skip fetch entirely
    if (!forceRefresh && lastFetch) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('/api/travel/trips');
      const tripsData = response.data.trips;
      setTrips(tripsData);

      const nowDate = new Date();
      const upcoming = tripsData.filter(trip => 
        (trip.start_date && new Date(trip.start_date) > nowDate) || 
        (trip.status === 'planned' || trip.status === 'ongoing')
      ).length;
      const completed = tripsData.filter(trip => trip.status === 'completed').length;
      const totalBudget = tripsData.reduce((sum, trip) => sum + (trip.budget || 0), 0);

      const newStats = {
        totalTrips: tripsData.length,
        upcomingTrips: upcoming,
        totalBudget: totalBudget,
        completedTrips: completed
      };
      setStats(newStats);

      // Generate mock recent activities
      const activities = [
        { id: 1, type: 'trip_created', title: 'New adventure planned', time: '2 hours ago', icon: 'FaPlus', color: 'primary' },
        { id: 2, type: 'trip_updated', title: 'Updated Tokyo itinerary', time: '5 hours ago', icon: 'FaEdit', color: 'primary' },
        { id: 3, type: 'achievement', title: 'Earned Explorer Badge', time: '1 day ago', icon: 'FaTrophy', color: 'primary' },
        { id: 4, type: 'social', title: 'Shared travel photos', time: '2 days ago', icon: 'FaImage', color: 'primary' }
      ];
      setRecentActivities(activities);

      // Generate mock achievements
      const mockAchievements = [
        { id: 1, name: 'World Explorer', description: 'Visit 5+ countries', icon: 'FaGlobe', progress: 60, unlocked: false },
        { id: 2, name: 'Budget Master', description: 'Stay under budget 3 times', icon: 'FaCoins', progress: 100, unlocked: true },
        { id: 3, name: 'Adventure Seeker', description: 'Complete 10 trips', icon: 'FaCompass', progress: 70, unlocked: false },
        { id: 4, name: 'Social Butterfly', description: 'Share 5 trips', icon: 'FaUserFriends', progress: 40, unlocked: false }
      ];
      setAchievements(mockAchievements);

      // Cache the data
      localStorage.setItem('roamiq_cached_trips', JSON.stringify(tripsData));
      localStorage.setItem('roamiq_cached_stats', JSON.stringify(newStats));
      localStorage.setItem('roamiq_cached_activities', JSON.stringify(activities));
      localStorage.setItem('roamiq_cached_achievements', JSON.stringify(mockAchievements));
      localStorage.setItem('roamiq_last_fetch', now.toString());
      setLastFetch(now);

    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  }, [lastFetch]);

  const invalidateCache = useCallback(() => {
    localStorage.removeItem('roamiq_cached_trips');
    localStorage.removeItem('roamiq_cached_stats');
    localStorage.removeItem('roamiq_cached_activities');
    localStorage.removeItem('roamiq_cached_achievements');
    localStorage.removeItem('roamiq_last_fetch');
    setLastFetch(null);
  }, []);

  const refreshData = useCallback(() => {
    invalidateCache();
    fetchTrips(true);
  }, [invalidateCache, fetchTrips]);

  const value = {
    trips,
    stats,
    recentActivities,
    achievements,
    loading,
    fetchTrips,
    refreshData,
    invalidateCache
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

