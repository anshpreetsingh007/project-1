import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import os
from datetime import datetime

print("Run started at:", datetime.now())

df = pd.read_csv('All_Diets.csv')
print("\nDataset shape:", df.shape)
print("\nFirst 5 rows:\n", df.head())

numeric_cols = ['Protein(g)', 'Carbs(g)', 'Fat(g)']
print("\nMissing values BEFORE cleaning:\n", df[numeric_cols].isnull().sum())

df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())

print("\nMissing values AFTER cleaning:\n", df[numeric_cols].isnull().sum())

df['Diet_type'] = df['Diet_type'].str.strip().str.title()

avg_macros = df.groupby('Diet_type')[numeric_cols].mean()
print("\n=== Average Macronutrients per Diet Type ===")
print(avg_macros)

top_protein = df.sort_values('Protein(g)', ascending=False).groupby('Diet_type').head(5)
print("\n=== Top 5 Protein-Rich Recipes per Diet Type ===")
print(top_protein[['Diet_type', 'Recipe_name', 'Protein(g)']].to_string(index=False))

highest_protein_diet = avg_macros['Protein(g)'].idxmax()
print("\n=== Diet Type with Highest Average Protein ===")
print(highest_protein_diet, "->", avg_macros.loc[highest_protein_diet, 'Protein(g)'], "g")

most_common_cuisine = df.groupby('Diet_type')['Cuisine_type'].agg(lambda x: x.value_counts().index[0])
print("\n=== Most Common Cuisine per Diet Type ===")
print(most_common_cuisine)

df['Protein_to_Carbs_ratio'] = df['Protein(g)'] / df['Carbs(g)'].replace(0, pd.NA)
df['Carbs_to_Fat_ratio']     = df['Carbs(g)']   / df['Fat(g)'].replace(0, pd.NA)
print("\n=== Sample Computed Ratios ===")
print(df[['Recipe_name', 'Protein_to_Carbs_ratio', 'Carbs_to_Fat_ratio']].head(10).to_string(index=False))

os.makedirs('output', exist_ok=True)
df.to_csv('output/All_Diets_cleaned.csv', index=False)
print("\nSaved cleaned dataset to output/All_Diets_cleaned.csv")

avg_macros.plot(kind='bar', figsize=(12, 6))
plt.title('Average Macronutrient Content by Diet Type')
plt.ylabel('Average Amount (g)')
plt.xlabel('Diet Type')
plt.xticks(rotation=45, ha='right')
plt.legend(title='Macronutrient')
plt.tight_layout()
plt.savefig('output/bar_avg_macros.png')
plt.close()
print("Saved: output/bar_avg_macros.png")

plt.figure(figsize=(10, 6))
sns.heatmap(avg_macros, annot=True, fmt='.1f', cmap='YlOrRd')
plt.title('Macronutrient Heatmap by Diet Type')
plt.tight_layout()
plt.savefig('output/heatmap_macros.png')
plt.close()
print("Saved: output/heatmap_macros.png")

plt.figure(figsize=(12, 7))
sns.scatterplot(data=top_protein, x='Cuisine_type', y='Protein(g)', hue='Diet_type', s=100)
plt.title('Top 5 Protein-Rich Recipes: Protein by Cuisine and Diet Type')
plt.xlabel('Cuisine Type')
plt.ylabel('Protein (g)')
plt.xticks(rotation=45, ha='right')
plt.legend(title='Diet Type', bbox_to_anchor=(1.05, 1), loc='upper left')
plt.tight_layout()
plt.savefig('output/scatter_top_protein.png')
plt.close()
print("Saved: output/scatter_top_protein.png")

print("\nRun finished at:", datetime.now())
print("All analysis complete. Check the 'output/' folder for charts.")
