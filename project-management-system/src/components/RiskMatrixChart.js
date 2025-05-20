import React from 'react';
import styles from '../componentsStyles/RiskMatrixChart.module.css';

const RiskMatrixChart = ({ risks }) => {
  const matrix = [
    ['high', 'H3', 'H4', 'H5'],
    ['medium', 'M2', 'M3', 'H4'],
    ['low', 'L1', 'M2', 'H3']
  ];

  const getRisksForCell = (severity, probability) => {
    return risks.filter(risk => 
      risk.severity === severity && 
      risk.probability === probability
    );
  };

  const getCellColor = (value) => {
    if (value.startsWith('H')) return styles.highRisk;
    if (value.startsWith('M')) return styles.mediumRisk;
    return styles.lowRisk;
  };

  return (
    <div className={styles.matrixContainer}>
      <div className={styles.matrix}>
        <div className={styles.yLabel}>Severity</div>
        <div className={styles.xLabel}>Probability</div>
        
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Low</th>
              <th>Medium</th>
              <th>High</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <th>{row[0].toUpperCase()}</th>
                {['low', 'medium', 'high'].map((prob, j) => (
                  <td key={j} className={getCellColor(row[j + 1])}>
                    {getRisksForCell(row[0], prob).map(risk => (
                      <div key={risk.id} className={styles.riskDot} title={risk.title}>
                        {risk.id}
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskMatrixChart;
