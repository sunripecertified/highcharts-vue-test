import { ref } from 'vue'
import { Chart } from 'highcharts-vue'

export const TestChart = {
  components: {
    Chart
  },
  setup() {
    const chartOptions = ref({
      chart: {
        type: 'line'
      },
      title: {
        text: 'Hello World'
      },
      xAxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      },
      series: [{
        name: 'Hello World',
        data: [1, 3, 2, 4, 6, 5]
      }]
    })

    return { chartOptions }
  },
  template: `<Chart :options="chartOptions"></Chart>`
}
