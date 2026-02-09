// Business Model Templates for Restohand
// According to: /docs/business/model.md

async getRecommendedTemplates() {
  return [
    // STARTER PLAN - ₹999/month + 2% transaction fee
    {
      id: 'starter_monthly',
      name: 'Starter (Monthly)',
      plan_id: 'restohand_starter_monthly',
      plan_name: 'Restohand Starter Monthly Plan',
      plan_type: 'PERIODIC',
      plan_recurring_amount: 99900, // ₹999
      plan_max_amount: 99900,
      plan_max_cycles: 12,
      plan_intervals: 1,
      plan_currency: 'INR',
      plan_interval_type: 'MONTH',
      plan_note: 'Starter plan for small cafes and QSRs - ₹999/month + 2% transaction fee',
      tier: 'starter',
      display_name: 'Starter',
      description: 'Perfect for small cafes, QSRs, and family restaurants (40-60 seats)',
      features: [
        'qr_menu_ordering',
        'digital_receipts',
        'basic_pos',
        'order_management',
        'real_time_analytics'
      ],
      is_popular: false,
      usage_limits: {
        max_branches: 1,
        max_tables: 20,
        max_staff: 5,
        max_menu_items: 75
      },
      pricing: {
        base_subscription_fee: 99900, // ₹999 in paisa
        transaction_fee_percentage: 2.0,
        currency: 'INR'
      },
      feature_access: {
        qr_menu_ordering: true,
        digital_receipts: true,
        basic_pos: true,
        order_management: true,
        real_time_analytics: true,
        advanced_analytics: false,
        customer_crm: false,
        inventory_management: false,
        multi_location_management: false,
        priority_support: false,
        custom_integrations: false,
        api_access: false,
        white_label_options: false
      },
      target_market: {
        segment: 'Small cafes, QSRs, family restaurants',
        ideal_size: '40-60 seats',
        use_cases: [
          'QR-based self-ordering',
          'Digital payment acceptance',
          'Basic order management',
          'E-receipts',
          'Real-time order tracking'
        ]
      },
      metadata: {
        target_segment: 'Small cafes, QSRs, family restaurants',
        key_benefit: 'Complete POS + QR ordering solution'
      }
    },
    // PROFESSIONAL PLAN - ₹2,999/month + 2% transaction fee ⭐ MOST POPULAR
    {
      id: 'professional_monthly',
      name: 'Professional (Monthly)',
      plan_id: 'restohand_professional_monthly',
      plan_name: 'Restohand Professional Monthly Plan',
      plan_type: 'PERIODIC',
      plan_recurring_amount: 299900, // ₹2,999
      plan_max_amount: 299900,
      plan_max_cycles: 12,
      plan_intervals: 1,
      plan_currency: 'INR',
      plan_interval_type: 'MONTH',
      plan_note: 'Professional plan for growing restaurants - ₹2,999/month + 2% transaction fee',
      tier: 'professional',
      display_name: 'Professional',
      description: 'Best for multi-location chains and mid-size restaurants (100-130 seats)',
      features: [
        'qr_menu_ordering',
        'digital_receipts',
        'basic_pos',
        'order_management',
        'real_time_analytics',
        'advanced_analytics',
        'customer_crm',
        'inventory_management',
        'multi_location_management'
      ],
      is_popular: true,
      usage_limits: {
        max_branches: 3,
        max_tables: 50,
        max_staff: 15,
        max_menu_items: 200
      },
      pricing: {
        base_subscription_fee: 299900, // ₹2,999 in paisa
        transaction_fee_percentage: 2.0,
        currency: 'INR'
      },
      feature_access: {
        qr_menu_ordering: true,
        digital_receipts: true,
        basic_pos: true,
        order_management: true,
        real_time_analytics: true,
        advanced_analytics: true,
        customer_crm: true,
        inventory_management: true,
        multi_location_management: true,
        priority_support: true,
        custom_integrations: false,
        api_access: false,
        white_label_options: false
      },
      target_market: {
        segment: 'Multi-location chains, mid-size restaurants',
        ideal_size: '100-130 seats',
        use_cases: [
          'Multi-branch management',
          'Advanced analytics & reports',
          'Customer relationship management',
          'Inventory tracking',
          'Priority customer support'
        ]
      },
      metadata: {
        target_segment: 'Multi-location chains, mid-size restaurants',
        key_benefit: 'Complete business management solution'
      }
    },
    // ENTERPRISE PLAN - ₹5,999/month + 2% transaction fee
    {
      id: 'enterprise_monthly',
      name: 'Enterprise (Monthly)',
      plan_id: 'restohand_enterprise_monthly',
      plan_name: 'Restohand Enterprise Monthly Plan',
      plan_type: 'PERIODIC',
      plan_recurring_amount: 599900, // ₹5,999
      plan_max_amount: 599900,
      plan_max_cycles: 12,
      plan_intervals: 1,
      plan_currency: 'INR',
      plan_interval_type: 'MONTH',
      plan_note: 'Enterprise plan for large chains and franchises - ₹5,999/month + 2% transaction fee',
      tier: 'enterprise',
      display_name: 'Enterprise',
      description: 'For large chains, fine dining groups, and franchises',
      features: [
        'qr_menu_ordering',
        'digital_receipts',
        'basic_pos',
        'order_management',
        'real_time_analytics',
        'advanced_analytics',
        'customer_crm',
        'inventory_management',
        'multi_location_management',
        'custom_integrations',
        'api_access',
        'white_label_options'
      ],
      is_popular: false,
      usage_limits: {
        max_branches: -1, // Unlimited
        max_tables: -1, // Unlimited
        max_staff: -1, // Unlimited
        max_menu_items: -1 // Unlimited
      },
      pricing: {
        base_subscription_fee: 599900, // ₹5,999 in paisa
        transaction_fee_percentage: 2.0,
        currency: 'INR'
      },
      feature_access: {
        qr_menu_ordering: true,
        digital_receipts: true,
        basic_pos: true,
        order_management: true,
        real_time_analytics: true,
        advanced_analytics: true,
        customer_crm: true,
        inventory_management: true,
        multi_location_management: true,
        priority_support: true,
        custom_integrations: true,
        api_access: true,
        white_label_options: true
      },
      target_market: {
        segment: 'Large chains, fine dining groups, franchises',
        ideal_size: 'Enterprise scale',
        use_cases: [
          'Unlimited locations management',
          'Custom API integrations',
          'White-label solutions',
          'Dedicated account manager',
          'Enterprise-level support'
        ]
      },
      metadata: {
        target_segment: 'Large chains, fine dining groups, franchises',
        key_benefit: 'Unlimited scale + custom solutions'
      }
    }
  ];
}