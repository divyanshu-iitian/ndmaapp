import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { getTrainingReports } from '../services/storage';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const [reports, setReports] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('participants');
  const [chartType, setChartType] = useState('line');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await getTrainingReports();
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDate = () => {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getMetricData = () => {
    if (reports.length === 0) return { labels: [], data: [] };

    let labels = [];
    let data = [];

    switch (selectedMetric) {
      case 'participants':
        labels = reports.map((r, i) => `T${i + 1}`);
        data = reports.map(r => parseInt(r.participants) || 0);
        break;
      case 'completionRate':
        labels = reports.map((r, i) => `T${i + 1}`);
        data = reports.map(r => parseFloat(r.completionRate) || 0);
        break;
      case 'feedbackScore':
        labels = reports.map((r, i) => `T${i + 1}`);
        data = reports.map(r => parseFloat(r.feedbackScore) || 0);
        break;
      case 'attendanceRate':
        labels = reports.map((r, i) => `T${i + 1}`);
        data = reports.map(r => parseFloat(r.attendanceRate) || 0);
        break;
      case 'practicalScore':
        labels = reports.map((r, i) => `T${i + 1}`);
        data = reports.map(r => parseFloat(r.practicalScore) || 0);
        break;
      case 'trainingType':
        // For pie chart - count by training type
        const typeCounts = {};
        reports.forEach(r => {
          typeCounts[r.trainingType] = (typeCounts[r.trainingType] || 0) + 1;
        });
        return Object.entries(typeCounts).map(([name, count]) => ({
          name,
          population: count,
          color: getColorForType(name),
          legendFontColor: '#2D3748',
          legendFontSize: 14,
        }));
      default:
        return { labels: [], data: [] };
    }

    return { labels, data };
  };

  const getColorForType = (type) => {
    const colors = {
      'Earthquake': '#E53E3E',
      'Flood': '#3182CE',
      'Fire': '#DD6B20',
      'Cyclone': '#805AD5',
      'First Aid': '#38A169',
      'Search & Rescue': '#D69E2E',
    };
    return colors[type] || '#718096';
  };

  const renderChart = () => {
    if (reports.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyText}>No training reports yet</Text>
          <Text style={styles.emptySubtext}>Submit training reports to see analytics</Text>
        </View>
      );
    }

    const chartConfig = {
      backgroundColor: '#FFFFFF',
      backgroundGradientFrom: '#FFFFFF',
      backgroundGradientTo: '#FFFFFF',
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(26, 54, 93, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(45, 55, 72, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#4299E1',
      },
    };

    if (selectedMetric === 'trainingType') {
      const pieData = getMetricData();
      return (
        <View style={styles.chartContainer}>
          <PieChart
            data={pieData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      );
    }

    const { labels, data } = getMetricData();

    if (chartType === 'line') {
      return (
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels,
              datasets: [{ data }],
            }}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      );
    } else {
      return (
        <View style={styles.chartContainer}>
          <BarChart
            data={{
              labels,
              datasets: [{ data }],
            }}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
          />
        </View>
      );
    }
  };

  const getMetricTitle = () => {
    const titles = {
      participants: 'Number of Participants',
      completionRate: 'Completion Rate (%)',
      feedbackScore: 'Feedback Score',
      attendanceRate: 'Attendance Rate (%)',
      practicalScore: 'Practical Assessment Score (%)',
      trainingType: 'Training Type Distribution',
    };
    return titles[selectedMetric] || 'Training Metrics';
  };

  const calculateStats = () => {
    if (reports.length === 0) return null;

    const totalParticipants = reports.reduce((sum, r) => sum + (parseInt(r.participants) || 0), 0);
    const avgCompletion = reports.reduce((sum, r) => sum + (parseFloat(r.completionRate) || 0), 0) / reports.length;
    const avgFeedback = reports.reduce((sum, r) => sum + (parseFloat(r.feedbackScore) || 0), 0) / reports.length;
    const avgAttendance = reports.reduce((sum, r) => sum + (parseFloat(r.attendanceRate) || 0), 0) / reports.length;

    return {
      totalParticipants,
      avgCompletion: avgCompletion.toFixed(1),
      avgFeedback: avgFeedback.toFixed(1),
      avgAttendance: avgAttendance.toFixed(1),
      totalSessions: reports.length,
    };
  };

  const stats = calculateStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Training Analytics</Text>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={16} color="#718096" />
              <Text style={styles.date}>{getCurrentDate()}</Text>
            </View>
          </View>
        </View>

        {stats && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statPrimary]}>
              <Ionicons name="people" size={24} color="#1A365D" />
              <Text style={styles.statValue}>{stats.totalParticipants}</Text>
              <Text style={styles.statLabel}>Total Participants</Text>
            </View>
            
            <View style={[styles.statCard, styles.statSuccess]}>
              <Ionicons name="checkmark-circle" size={24} color="#38A169" />
              <Text style={styles.statValue}>{stats.avgCompletion}%</Text>
              <Text style={styles.statLabel}>Avg Completion</Text>
            </View>
            
            <View style={[styles.statCard, styles.statInfo]}>
              <Ionicons name="star" size={24} color="#4299E1" />
              <Text style={styles.statValue}>{stats.avgFeedback}/10</Text>
              <Text style={styles.statLabel}>Avg Feedback</Text>
            </View>
            
            <View style={[styles.statCard, styles.statWarning]}>
              <Ionicons name="calendar-sharp" size={24} color="#DD6B20" />
              <Text style={styles.statValue}>{stats.totalSessions}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
          </View>
        )}

        <View style={styles.controlsCard}>
          <Text style={styles.sectionTitle}>Select Metric</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedMetric}
              onValueChange={(value) => setSelectedMetric(value)}
              style={styles.picker}
            >
              <Picker.Item label="Participants" value="participants" />
              <Picker.Item label="Completion Rate" value="completionRate" />
              <Picker.Item label="Feedback Score" value="feedbackScore" />
              <Picker.Item label="Attendance Rate" value="attendanceRate" />
              <Picker.Item label="Practical Score" value="practicalScore" />
              <Picker.Item label="Training Type Distribution" value="trainingType" />
            </Picker>
          </View>

          {selectedMetric !== 'trainingType' && (
            <>
              <Text style={styles.sectionTitle}>Chart Type</Text>
              <View style={styles.chartTypeButtons}>
                <TouchableOpacity
                  style={[styles.chartTypeButton, chartType === 'line' && styles.chartTypeActive]}
                  onPress={() => setChartType('line')}
                >
                  <Ionicons 
                    name="trending-up" 
                    size={20} 
                    color={chartType === 'line' ? '#FFFFFF' : '#4A5568'} 
                  />
                  <Text style={[styles.chartTypeText, chartType === 'line' && styles.chartTypeTextActive]}>
                    Line Chart
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.chartTypeButton, chartType === 'bar' && styles.chartTypeActive]}
                  onPress={() => setChartType('bar')}
                >
                  <Ionicons 
                    name="bar-chart" 
                    size={20} 
                    color={chartType === 'bar' ? '#FFFFFF' : '#4A5568'} 
                  />
                  <Text style={[styles.chartTypeText, chartType === 'bar' && styles.chartTypeTextActive]}>
                    Bar Chart
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{getMetricTitle()}</Text>
          {renderChart()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 14,
    color: '#718096',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A365D',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
    textAlign: 'center',
  },
  controlsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 12,
    marginTop: 8,
  },
  pickerWrapper: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  chartTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  chartTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartTypeActive: {
    backgroundColor: '#1A365D',
    borderColor: '#1A365D',
  },
  chartTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  chartTypeTextActive: {
    color: '#FFFFFF',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#718096',
    marginTop: 8,
  },
});
