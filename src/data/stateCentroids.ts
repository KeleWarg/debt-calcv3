/**
 * State Centroids Data
 * 
 * Longitude/latitude coordinates for the center of each US state
 * Used to position the map pin marker on the interactive map
 * Format: [longitude, latitude]
 */

export const stateCentroids: Record<string, [number, number]> = {
  'Alabama': [-86.9023, 32.3182],
  'Alaska': [-153.4937, 64.2008],
  'Arizona': [-111.0937, 34.0489],
  'Arkansas': [-92.3731, 34.9697],
  'California': [-119.4179, 36.7783],
  'Colorado': [-105.3111, 39.0598],
  'Connecticut': [-72.7554, 41.6032],
  'Delaware': [-75.5277, 38.9108],
  'District of Columbia': [-77.0369, 38.9072],
  'Washington DC': [-77.0369, 38.9072],
  'Florida': [-81.5158, 27.6648],
  'Georgia': [-83.6431, 32.1656],
  'Hawaii': [-155.5828, 19.8968],
  'Idaho': [-114.7420, 44.0682],
  'Illinois': [-89.3985, 40.6331],
  'Indiana': [-86.1349, 40.2672],
  'Iowa': [-93.0977, 41.8780],
  'Kansas': [-98.4842, 39.0119],
  'Kentucky': [-84.2700, 37.8393],
  'Louisiana': [-91.9623, 30.9843],
  'Maine': [-69.4455, 45.2538],
  'Maryland': [-76.6413, 39.0458],
  'Massachusetts': [-71.3824, 42.4072],
  'Michigan': [-85.6024, 44.3148],
  'Minnesota': [-94.6859, 46.7296],
  'Mississippi': [-89.3985, 32.3547],
  'Missouri': [-91.8318, 37.9643],
  'Montana': [-110.3626, 46.8797],
  'Nebraska': [-99.9018, 41.4925],
  'Nevada': [-116.4194, 38.8026],
  'New Hampshire': [-71.5724, 43.1939],
  'New Jersey': [-74.4057, 40.0583],
  'New Mexico': [-105.8701, 34.5199],
  'New York': [-75.4999, 43.2994],
  'North Carolina': [-79.0193, 35.7596],
  'North Dakota': [-101.0020, 47.5515],
  'Ohio': [-82.9071, 40.4173],
  'Oklahoma': [-97.0929, 35.0078],
  'Oregon': [-120.5542, 43.8041],
  'Pennsylvania': [-77.1945, 41.2033],
  'Rhode Island': [-71.4774, 41.5801],
  'South Carolina': [-81.1637, 33.8361],
  'South Dakota': [-99.9018, 43.9695],
  'Tennessee': [-86.5804, 35.5175],
  'Texas': [-99.9018, 31.9686],
  'Utah': [-111.0937, 39.3210],
  'Vermont': [-72.5778, 44.5588],
  'Virginia': [-78.6569, 37.4316],
  'Washington': [-120.7401, 47.7511],
  'West Virginia': [-80.4549, 38.5976],
  'Wisconsin': [-89.6165, 43.7844],
  'Wyoming': [-107.2903, 43.0760],
}

/**
 * Get centroid coordinates for a state
 * Returns undefined if state not found
 */
export function getStateCentroid(stateName: string): [number, number] | undefined {
  return stateCentroids[stateName]
}
