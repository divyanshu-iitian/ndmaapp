import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import ReportsService from '../services/ReportsService';

const { width, height } = Dimensions.get('window');
const chartWidth = width - 40;

export default function AuthorityAnalyticsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview'); // overview | organizations | trends

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    const res = await ReportsService.getAnalytics();
    if (res.success) {
      setAnalytics(res.analytics);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047BA" />
          <Text style={styles.loadingText}>Loading Analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load analytics</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadAnalytics}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare Status Pie Chart Data
  const statusData = [
    { name: 'Accepted', count: analytics.statusCounts.accepted || 0, color: '#10B981', legendFontColor: '#333' },
    { name: 'Pending', count: analytics.statusCounts.pending || 0, color: '#FFC107', legendFontColor: '#333' },
    { name: 'Rejected', count: analytics.statusCounts.rejected || 0, color: '#EF4444', legendFontColor: '#333' },
    { name: 'Draft', count: analytics.statusCounts.draft || 0, color: '#9CA3AF', legendFontColor: '#333' },
  ].filter(item => item.count > 0);

  // Prepare Organization Bar Chart Data
  const orgLabels = Object.keys(analytics.organizationCounts || {}).slice(0, 5); // Top 5
  const orgData = orgLabels.map(label => analytics.organizationCounts[label]);

  // Prepare Monthly Trend Line Chart Data
  const monthlyLabels = Object.keys(analytics.monthlyData || {}).slice(0, 6);
  const monthlyValues = monthlyLabels.map(label => analytics.monthlyData[label]);

  // Prepare Training Type Bar Chart Data
  const trainingLabels = Object.keys(analytics.trainingTypeCounts || {}).slice(0, 5);
  const trainingData = trainingLabels.map(label => analytics.trainingTypeCounts[label]);

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(0, 71, 186, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 10,
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0047BA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <TouchableOpacity onPress={loadAnalytics}>
          <Ionicons name="refresh" size={24} color="#0047BA" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['overview', 'organizations', 'trends'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.tabActive]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <Animatable.View animation="fadeInDown" style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="document-text" size={28} color="#0047BA" />
            <Text style={styles.summaryValue}>{analytics.totalReports || 0}</Text>
            <Text style={styles.summaryLabel}>Total Reports</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            <Text style={styles.summaryValue}>{analytics.acceptedReportsCount || 0}</Text>
            <Text style={styles.summaryLabel}>Accepted</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="people" size={28} color="#F59E0B" />
            <Text style={styles.summaryValue}>{analytics.totalParticipants || 0}</Text>
            <Text style={styles.summaryLabel}>Total Participants</Text>
          </View>
        </Animatable.View>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Status Distribution Pie Chart */}
            {statusData.length > 0 && (
              <Animatable.View animation="zoomIn" delay={200} style={styles.chartContainer}>
                <Text style={styles.chartTitle}>📊 Report Status Distribution</Text>
                <PieChart
                  data={statusData}
                  width={chartWidth}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="count"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
                <View style={styles.legendContainer}>
                  {statusData.map((item, idx) => (
                    <View key={idx} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                      <Text style={styles.legendText}>{item.name}: {item.count}</Text>
                    </View>
                  ))}
                </View>
              </Animatable.View>
            )}

            {/* Training Type Bar Chart */}
            {trainingLabels.length > 0 && (
              <Animatable.View animation="fadeInUp" delay={400} style={styles.chartContainer}>
                <Text style={styles.chartTitle}>📚 Top Training Types</Text>
                <BarChart
                  data={{
                    labels: trainingLabels.map(l => l.slice(0, 8)), // Truncate labels
                    datasets: [{ data: trainingData }],
                  }}
                  width={chartWidth}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  }}
                  fromZero
                  showValuesOnTopOfBars
                  style={styles.chart}
                />
              </Animatable.View>
            )}
          </>
        )}

        {/* Organizations Tab */}
        {selectedTab === 'organizations' && (
          <>
            {orgLabels.length > 0 && (
              <Animatable.View animation="fadeInLeft" style={styles.chartContainer}>
                <Text style={styles.chartTitle}>🏢 Organization Distribution</Text>
                <BarChart
                  data={{
                    labels: orgLabels.map(l => l.slice(0, 8)),
                    datasets: [{ data: orgData }],
                  }}
                  width={chartWidth}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                  }}
                  fromZero
                  showValuesOnTopOfBars
                  style={styles.chart}
                />
              </Animatable.View>
            )}

            {/* Organization List */}
            <Animatable.View animation="fadeInRight" delay={200} style={styles.orgListContainer}>
              <Text style={styles.chartTitle}>All Organizations</Text>
              {Object.entries(analytics.organizationCounts || {}).map(([org, count], idx) => (
                <View key={idx} style={styles.orgItem}>
                  <View style={styles.orgLeft}>
                    <Ionicons name="business" size={20} color="#0047BA" />
                    <Text style={styles.orgName}>{org}</Text>
                  </View>
                  <View style={styles.orgRight}>
                    <Text style={styles.orgCount}>{count}</Text>
                    <Text style={styles.orgLabel}>reports</Text>
                  </View>
                </View>
              ))}
            </Animatable.View>
          </>
        )}

        {/* Trends Tab */}
        {selectedTab === 'trends' && (
          <>
            {monthlyLabels.length > 0 && (
              <Animatable.View animation="fadeInUp" style={styles.chartContainer}>
                <Text style={styles.chartTitle}>📈 Monthly Trends (Last 6 Months)</Text>
                <LineChart
                  data={{
                    labels: monthlyLabels.map(l => l.slice(5)), // Show only month-day
                    datasets: [{ data: monthlyValues.length > 0 ? monthlyValues : [0] }],
                  }}
                  width={chartWidth}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                  }}
                  bezier
                  style={styles.chart}
                />
              </Animatable.View>
            )}

            {/* Insights */}
            <Animatable.View animation="fadeInUp" delay={200} style={styles.insightsContainer}>
              <Text style={styles.chartTitle}>💡 Key Insights</Text>
              <View style={styles.insightItem}>
                <Ionicons name="trending-up" size={24} color="#10B981" />
                <Text style={styles.insightText}>
                  {analytics.acceptedReportsCount} trainings successfully completed
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Ionicons name="people" size={24} color="#0047BA" />
                <Text style={styles.insightText}>
                  {analytics.totalParticipants} total participants trained
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Ionicons name="time" size={24} color="#F59E0B" />
                <Text style={styles.insightText}>
                  {analytics.statusCounts.pending || 0} reports awaiting review
                </Text>
              </View>
            </Animatable.View>
          </>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0047BA',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0047BA',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#0047BA',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  chartContainer: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  legendContainer: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  orgListContainer: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orgItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orgLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orgName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  orgRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0047BA',
    marginRight: 4,
  },
  orgLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  insightsContainer: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  insightText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
});
