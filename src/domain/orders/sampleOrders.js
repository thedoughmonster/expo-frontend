const parseTimestamp = (value) => {
  if (!value) {
    return undefined
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const cloneModifiers = (modifiers = []) =>
  modifiers.map((modifier) => ({
    ...modifier,
  }))

const cloneItems = (items = []) =>
  items.map((item) => ({
    ...item,
    modifiers: cloneModifiers(item.modifiers),
    prepStations: Array.isArray(item.prepStations) ? [...item.prepStations] : undefined,
  }))

const RAW_SAMPLE_ORDERS = [
  {
    id: '6efafdc1-0351-4d19-a4e2-b2938062a1aa',
    displayId: '61',
    guid: '6efafdc1-0351-4d19-a4e2-b2938062a1aa',
    status: 'APPROVED',
    createdAtRaw: '2025-11-01T17:00:49.753+0000',
    total: 15.22,
    currency: 'USD',
    customerName: 'Visa Cardholder',
    diningOption: 'Dine In',
    fulfillmentStatus: 'READY',
    tabName: 'Michaela',
    items: [
      {
        id: '1448f463-ff7b-4ea9-b239-30bbebae24a0',
        name: '🍳 Build-A-Brekky',
        quantity: 1,
        price: 6.25,
        currency: 'USD',
        modifiers: [
          {
            id: 'bfd6a821-b4cc-4ea3-9d8c-aad0084aca8b',
            name: 'Toasted Glazed Doughnut',
            quantity: 1,
          },
          {
            id: 'b47945fd-c676-4023-8460-68a7e826c86d',
            name: '1 Egg (whole)',
            quantity: 1,
          },
          {
            id: 'b7132c84-c965-45b2-bc07-afd3db15d2e8',
            name: 'DM Pork Sausage',
            quantity: 1,
          },
          {
            id: '5ddc722c-18ec-4fb8-b5b3-9764a1746ff6',
            name: 'American Cheese',
            quantity: 1,
          },
        ],
      },
      {
        id: 'a8d4b7fd-3ab5-48db-976a-53a82902af4a',
        name: 'Hot Custom Latte',
        quantity: 1,
        price: 5.75,
        currency: 'USD',
        modifiers: [
          {
            id: '5ae38a8f-a5b8-4652-abdb-fe772d3a0ef1',
            name: '20 oz',
            quantity: 1,
          },
          {
            id: '987fae3c-d947-43bc-97c3-d2f490c1b282',
            name: 'Caramel Apple Butter',
            quantity: 1,
          },
        ],
      },
    ],
  },
  {
    id: '6522496f-f997-43c1-9782-cd5dee2e9cce',
    displayId: '60',
    guid: '6522496f-f997-43c1-9782-cd5dee2e9cce',
    status: 'APPROVED',
    createdAtRaw: '2025-11-01T16:47:32.287+0000',
    total: 15.27,
    currency: 'USD',
    customerName: 'Allison Smith',
    diningOption: 'Online Ordering - Takeout',
    fulfillmentStatus: 'READY',
    tabName: 'Allison Smith',
    items: [
      {
        id: 'bfd785da-4fc7-4979-90d0-43cfdfc69a8b',
        name: 'Custom Iced Latte',
        quantity: 1,
        price: 7.75,
        currency: 'USD',
        modifiers: [
          {
            id: 'd35a0e11-e4cb-40c5-8fec-e301ca6a761a',
            name: 'Flavor',
            quantity: 1,
          },
          {
            id: '180e4bd6-ee70-4b08-8d36-0c16cc263b25',
            name: '24oz',
            quantity: 1,
          },
          {
            id: '15edd483-3c94-443f-bcab-f256c923d0ce',
            name: 'Sweet Cream Cold Foam',
            quantity: 1,
          },
          {
            id: 'f00e908e-d583-4f80-b173-d8edd627b434',
            name: 'Add Regular Double Shot',
            quantity: 1,
          },
        ],
      },
      {
        id: '1aca33a7-85aa-4abd-a1d6-1b2b5cc8f315',
        name: '🌩 Thunder Cloud Cold Brew',
        quantity: 1,
        price: 6.65,
        currency: 'USD',
        modifiers: [
          {
            id: 'f11b1ee6-f55c-43cb-b20d-5f4503c821ba',
            name: '24oz',
            quantity: 1,
          },
        ],
      },
    ],
  },
  {
    id: '4ff5a7d7-1602-4c37-9a61-f109c2ae7af5',
    displayId: '58',
    guid: '4ff5a7d7-1602-4c37-9a61-f109c2ae7af5',
    status: 'APPROVED',
    createdAtRaw: '2025-11-01T16:28:38.583+0000',
    total: 7.13,
    currency: 'USD',
    customerName: 'Morgan Vanatta',
    diningOption: 'Take Out',
    fulfillmentStatus: 'READY',
    tabName: 'Morgan',
    items: [
      {
        id: '54740340-29e8-4e3c-936c-1f00b948e771',
        name: 'Custom Iced Latte',
        quantity: 1,
        price: 5.75,
        currency: 'USD',
        modifiers: [
          {
            id: '15fc8965-b6a7-4948-9afa-c4c4aacd29bd',
            name: 'Flavor',
            quantity: 1,
          },
          {
            id: '4532b002-c7e6-4fef-8195-1c0e6e4e7157',
            name: '24oz',
            quantity: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'bbf335d7-c0e5-40b6-a345-c45078c2af50',
    displayId: '43',
    guid: 'bbf335d7-c0e5-40b6-a345-c45078c2af50',
    status: 'APPROVED',
    createdAtRaw: '2025-11-01T14:49:10.311+0000',
    total: 0,
    currency: 'USD',
    diningOption: 'Take Out',
    fulfillmentStatus: 'SENT',
    tabName: 'Zac',
    items: [
      {
        id: 'd6016a10-3f77-4c42-afa4-d9552172b136',
        name: 'Gift Card',
        quantity: 1,
        price: 0,
        currency: 'USD',
        modifiers: [],
      },
    ],
  },
]

export const createSampleOrders = () =>
  RAW_SAMPLE_ORDERS.map((order) => ({
    ...order,
    createdAt: parseTimestamp(order.createdAtRaw),
    items: cloneItems(order.items),
    prepStationGuids: Array.isArray(order.prepStationGuids)
      ? [...order.prepStationGuids]
      : undefined,
  }))

